import axios from "axios";
import dotenv from "dotenv"
import tmi from "tmi.js"

dotenv.config({path: "../.env"})

const client = tmi.Client({
    options: {
        clientId: process.env["CLIENT_ID"]
    },
    identity: {
        username: "HypixelStats",
        password: process.env["CLIENT_OAUTH"] as string,
    },
    channels: ["HayHayIsLive", "Cakadyboi"]
})

async function connect() {
    await client.connect()
}


client.on("chat", async (channel, userState, message, self) => {
    
    if (!message.startsWith("h!")) return;
    const arr = message.split(" ")
    const data = await getHypixelInfo(arr[2]);

    if (data == null) return;

    const response = parseData(data, arr[1])

    if (response == null) {
        return client.say(channel, "User not found. Please try again later.")
    }

    return client.say(channel, `Stats for ${arr[2]}: Wins: ${response["wins"]}, Losses: ${response["losses"]}, Winstreak: ${response["winstreak"]}, FKDR: ${response["fkdr"]}`)

})

function parseData(data : any, game : string) {
    let response = null;

    switch (game) {
        case "bw" || "bedwars":
            data = data["stats"]["Bedwars"]
            const fkdr = (data["final_kills_bedwars"] / data["final_deaths_bedwars"]).toPrecision(4);
            
            response = {
                "fkdr": fkdr,
                "losses": data["losses_bedwars"],
                "wins": data["wins_bedwars"],
                "winstreak": data["winstreak"]
            }
            // console.log(response)
            break;
    
        default:
            response = null;
            break;
    }

    return response;
}

async function getUUID(name : string) {
    let uuid;

    try {
        const resp = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${name}`)

        uuid = resp.data["id"]
    } catch (error) {
        return null;
    }

    return uuid;
}

async function getHypixelInfo(name : string) {

    const uuid = await getUUID(name)
    if (uuid == null) {
        return null;   
    }

    try {
        const resp = await axios.get("https://api.hypixel.net/player", {
            headers: {
                "API-Key": process.env["HYPIXEL_KEY"] as string,
            },
            params: {
                "uuid": uuid,
            }
        })

        return resp.data["player"]
    } catch (error) {
        return null;
    }
}

// getUUID("HayHayIsALoser")
connect()