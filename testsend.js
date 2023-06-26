import net from "net";

function wait() {
    const ms = 500;
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Done waiting");
            resolve(ms)
        }, ms )
    })
}

const rcpt = process.argv[2];

const client = net.connect({
    port: 2525,
    host: "localhost"
}, () => {});

client.on("data", (msg) => {console.log(msg.toString())});

async function send() {
    await wait();
    client.write("HELO you\r\n");
    await wait();
    console.log(process.argv[5]);
    client.write(`MAIL FROM:<${process.argv[5] || "fake@unreal"}>\r\n`);
    await wait();
    client.write("RCPT TO: <" + rcpt + ">\r\n");
    await wait();
    client.write("DATA\r\n");
    await wait();
    client.write(`Subject: ${process.argv[4] || "test"}\r\n`);
    await wait();
    client.write("\r\n");
    await wait();
    client.write((process.argv[3] || "Hello") + "\r\n");
    await wait();
    client.write("\r\n");
    await wait();
    client.write(".\r\n");
    console.log("done");
    await wait();
    process.exit(0);
}

send();
