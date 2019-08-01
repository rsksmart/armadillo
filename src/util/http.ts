import http from 'http';

export async function get(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            res.setEncoding('utf8');

            let body = ''
            res.on('data', (chunk) => {
              body += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch (e) {
                    reject(e.message);
                }
            });
        });
    })
}