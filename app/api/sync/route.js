import { createClient } from '@supabase/supabase-js';

// This API route is called by a Vercel cron job daily
// It fetches trades from IBKR Flex Query and upserts into Supabase

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Step 1: Request Flex Query report from IBKR
    const flexToken = process.env.IBKR_FLEX_TOKEN;
    const flexQueryId = process.env.IBKR_FLEX_QUERY_ID;

    const requestUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.SendRequest?t=${flexToken}&q=${flexQueryId}&v=3`;
    const requestRes = await fetch(requestUrl);
    const requestText = await requestRes.text();

    // Parse reference code from XML response
    const refCodeMatch = requestText.match(/<ReferenceCode>(\d+)<\/ReferenceCode>/);
    if (!refCodeMatch) {
      return Response.json({ error: 'Failed to get IBKR reference code', raw: requestText }, { status: 500 });
    }
    const refCode = refCodeMatch[1];

    // Step 2: Wait and fetch the actual report
    await new Promise(r => setTimeout(r, 3000));
    const fetchUrl = `https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement?q=${refCode}&t=${flexToken}&v=3`;
    const fetchRes = await fetch(fetchUrl);
    const fetchText = await fetchRes.text();

    // Step 3: Parse trade executions from XML
    const tradeRegex = /<TradeConfirm[^>]*symbol="([^"]*)"[^>]*tradeDate="([^"]*)"[^>]*buySell="([^"]*)"[^>]*price="([^"]*)"[^>]*quantity="([^"]*)"[^>]*tradeMoney="([^"]*)"[^>]*ibOrderID="([^"]*)"[^>]*/g;
    const trades = [];
    let match;

    while ((match = tradeRegex.exec(fetchText)) !== null) {
      trades.push({
        symbol: match[1],
        date: match[2].slice(0, 10),
        side: match[3],
        price: parseFloat(match[4]),
        quantity: parseFloat(match[5]),
        ibOrderId: match[7],
      });
    }

    // Step 4: Match buys and sells into completed trades and upsert
    // Get Abhilash's user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'Abhilash')
      .single();

    if (!profile) {
      return Response.json({ error: 'Owner profile not found' }, { status: 404 });
    }

    // For each sell, find matching buy and compute P&L
    const sells = trades.filter(t => t.side === 'SELL' || t.side === 'SLD');
    const upserted = [];

    for (const sell of sells) {
      const pnl = parseFloat(sell.price) * Math.abs(sell.quantity) * 100;
      const tradeId = `ibkr-${sell.ibOrderId}`;

      const { error } = await supabase.from('trades').upsert({
        id: tradeId,
        user_id: profile.id,
        date: sell.date,
        symbol: sell.symbol,
        exit_type: 'MARKET',
        pnl: pnl,
      }, { onConflict: 'id' });

      if (!error) upserted.push(tradeId);
    }

    return Response.json({
      success: true,
      synced: upserted.length,
      trades: upserted,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
