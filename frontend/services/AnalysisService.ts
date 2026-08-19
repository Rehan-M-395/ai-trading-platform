export const analyseChart = async (stockId: number) => {
    const response = await fetch(
        "http://localhost:5000/api/analysis/Sup-Res",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                stockId,
                timeframe: "5m"
            })
        }
    );
    console.log("this is stock id",stockId);
    console.log("Status:", response.status);

    const result = await response.text();

    console.log("Backend response:", result);

    if (!response.ok) {
        throw new Error(
            `Analysis failed: ${response.status} - ${result}`
        );
    }

    return JSON.parse(result);
};