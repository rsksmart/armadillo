const curl = new (require('curl-request'))();

start();

async function start(){
    await sleep(15000);
    
    var data = await getCurrentMainchain();
    
    if(!data.ok){
        process.exit(2);
    }

    if(data.data.forks != null && data.data.forks.length > 0 ){
        if(data.data.forks.some(x => x.length > 3)){
            console.log("New forks!!!");
            process.exit(2)
        }
    }

    console.log("There is no forks!!");
    process.exit(0)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCurrentMainchain() {

    return curl.get('34.67.238.129:6000/blockchains/50')
        .then(({ body }) => {
            return { ok: true, data: JSON.parse(body).data}
        })
        .catch((e) => {
            return { ok: false }
        });
}