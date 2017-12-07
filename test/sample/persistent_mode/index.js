const Client = require("../../../").Client;
const serverIp = "127.0.0.1";
const serverPort = 3005;

describe("#persistent-mode", function() {
    let client = null;
    before (() => {
        client = new Client({
            host : serverIp,
            port : serverPort,
            schemaDir: `${__dirname}/../../common/schema`,
            mode: "persistent"
        })
    })

    it('should return hi', async function () {
        let response = await client.call("test", "hi");
        assert(response.requestField === 'hi', 'incorrect response');
    });

    it('should return request timeout', async function () {
        try {
            await client.call("test", "hi", 50); //server will sleep 100ms before response
        }
        catch (err) {
            assert (err.message == "request timeout", 'incorrect response');
        }
    });
});