type AnalysisCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export const analyseChart = async (
  stockId: number,
  timeframe = "5m",
  candles?: AnalysisCandle[],
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/analysis/Sup-Res`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stockId, timeframe, candles }),
    },
  );

  const result = await response.text();

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.status} - ${result}`);
  }

  return JSON.parse(result);
};
