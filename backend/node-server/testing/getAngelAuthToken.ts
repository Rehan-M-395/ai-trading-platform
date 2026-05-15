import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

type LoginResponse = {
  status: boolean;
  message: string;
  errorcode: string;
  data?: {
    jwtToken?: string;
    refreshToken?: string;
    feedToken?: string;
  };
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

async function main() {
  const apiKey = getRequiredEnv("ANGEL_API_KEY");
  const clientCode = getRequiredEnv("ANGEL_CLIENT_CODE");
  const password = getRequiredEnv("ANGEL_PASSWORD");
  const localIp = getRequiredEnv("ANGEL_CLIENT_LOCAL_IP");
  const publicIp = getRequiredEnv("ANGEL_CLIENT_PUBLIC_IP");
  const macAddress = getRequiredEnv("ANGEL_MAC_ADDRESS");
  const sourceId = process.env.ANGEL_SOURCE_ID ?? "WEB";
  const userType = process.env.ANGEL_USER_TYPE ?? "USER";
  const totp =
    process.argv[2] ??
    process.env.ANGEL_TOTP_CODE ??
    "";

  if (!totp) {
    throw new Error(
      "Missing TOTP code. Pass it as `npx tsx testing/getAngelAuthToken.ts 123456` or set ANGEL_TOTP_CODE in .env",
    );
  }

  const response = await axios.post<LoginResponse>(
    "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
    {
      clientcode: clientCode,
      password,
      totp,
    },
    {
      headers: {
        "X-PrivateKey": apiKey,
        Accept: "application/json",
        "X-SourceID": sourceId,
        "X-ClientLocalIP": localIp,
        "X-ClientPublicIP": publicIp,
        "X-MACAddress": macAddress,
        "X-UserType": userType,
        "Content-Type": "application/json",
      },
    },
  );

  const result = response.data;

  if (!result.status || !result.data?.jwtToken) {
    throw new Error(
      `Login failed: ${result.message || result.errorcode || "Unknown error"}`,
    );
  }

  console.log("Login successful");
  console.log(`jwtToken=${result.data.jwtToken}`);
  console.log(`refreshToken=${result.data.refreshToken ?? ""}`);
  console.log(`feedToken=${result.data.feedToken ?? ""}`);
}

void main().catch((error: unknown) => {
  if (axios.isAxiosError(error)) {
    console.error("Request failed");
    console.error(error.response?.data ?? error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error");
  }

  process.exit(1);
});
