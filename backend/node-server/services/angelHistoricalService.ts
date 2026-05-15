import axios from "axios";

export type AngelExchange = "NSE" | "NFO" | "BSE" | "BFO" | "MCX";

export type AngelInterval =
  | "ONE_MINUTE"
  | "THREE_MINUTE"
  | "FIVE_MINUTE"
  | "TEN_MINUTE"
  | "FIFTEEN_MINUTE"
  | "THIRTY_MINUTE"
  | "ONE_HOUR"
  | "ONE_DAY";

export type AngelHistoricalRequest = {
  exchange: AngelExchange;
  symboltoken: string;
  interval: AngelInterval;
  fromdate: string;
  todate: string;
};

type AngelHistoricalResponse = {
  status: boolean;
  message: string;
  errorcode: string;
  data?: [string, number, number, number, number, number][];
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

function buildHeaders() {
  return {
    "X-PrivateKey": getRequiredEnv("ANGEL_API_KEY"),
    Accept: "application/json",
    "X-SourceID": process.env.ANGEL_SOURCE_ID ?? "WEB",
    "X-ClientLocalIP": getRequiredEnv("ANGEL_CLIENT_LOCAL_IP"),
    "X-ClientPublicIP": getRequiredEnv("ANGEL_CLIENT_PUBLIC_IP"),
    "X-MACAddress": getRequiredEnv("ANGEL_MAC_ADDRESS"),
    "X-UserType": process.env.ANGEL_USER_TYPE ?? "USER",
    Authorization: `Bearer ${getRequiredEnv("ANGEL_AUTH_TOKEN")}`,
    "Content-Type": "application/json",
  };
}

export async function fetchAngelHistoricalCandles(request: AngelHistoricalRequest) {
  const response = await axios.post<AngelHistoricalResponse>(
    "https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData",
    request,
    {
      headers: buildHeaders(),
    },
  );

  if (!response.data.status) {
    throw new Error(response.data.message || response.data.errorcode || "Angel historical API failed");
  }

  return response.data.data ?? [];
}
