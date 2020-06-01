import http from "http";

export async function get(url: string): Promise<any> {
    return new Promise((resolve: any, reject: any) => {
        http.get(url, (res: any) => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", (chunk: any) => {
              body += chunk;
            });

            res.on("end", () => {
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch (e) {
                    reject(`Error parsing response from: ${url}. Error: ${e.message}`);
                }
            });
        }).on('error', (e) => {
            reject(`Failed to GET ${url}. Error: ${e.message}`);
        });
    });
}
