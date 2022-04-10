const { Client, MessageEmbed, Intents } = require("discord.js");
const client = new Client({ disableEveryone: true, disabledEvents: ["TYPING_START"], intents: new Intents(32767) });
const config = require("./config.js");
const prefix = config.prefix;
const database = new Map();
const reactions = ["📰", "✊", "✂️"]

client.on("ready", () => {
    console.log(`${client.user.username} is active`);
});

const getResult = (partner, author, channel, message, member) => {
    let result;
    if (author === partner) return channel.send(`${message.author}: ${author}\n${member}: ${partner}\n${member} **It's a tie**`)
    else if (
        author === "✊" && partner === "✂️"
        || author === "📰" && partner === "✊"
        || author === "✂️" && partner === "📰"
    ) result = `${message.author} **Won the game!**`
    else if (
        partner === "✊" && author === "✂️"
        || partner === "📰" && author === "✊"
        || partner === "✂️" && author === "📰"
    ) result = `${member} **Won the game!**`
    return channel.send(`${message.author}: ${author}\n${member}: ${partner}\n${result}`)
}

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    let args = message.content.substring(prefix.length).split(" ");

    if (message.content.toLowerCase().startsWith(prefix + "rps")) {
        if (!args[1]) message.reply(`**:x: Mention the member you want to challenge**`)
        else {
            let member = message.mentions.members.first() || message.guild.members.cache.get(args[1])
            if (!member) message.reply(`**:x: Unknow member has been mentioned**`)
            else if (member.id === message.author.id) message.reply(`**:x: You can't play with yourself**`)
            else {
                message.channel.send(`${member} Answer ${message.author} Request if you want to accept the game by reacting **(✊, 📰, ✂️)**\n**Challenge Will Expire in 30secs.**`).then(msgcl => {
                    msgcl.react("✅");
                    msgcl.react("❌");
                    const collector = msgcl.createReactionCollector({ time: 30000 });
                    collector.on('collect', (reaction, user) => {
                        if (user.id === member.id && ['✅', '❌'].includes(reaction.emoji.name)) {
                            database.set(`${message.author.id}${member.id}`, { author: message.author.id, partner: member.id, type: reaction.emoji.name, channel: message.channel.id });
                            collector.stop();
                        }
                    });
                    collector.on('end', collected => {
                        if (database.get(`${message.author.id}${member.id}`)) {
                            let db = database.get(`${message.author.id}${member.id}`);
                            let game = {
                                author: message.guild.members.cache.get(db['author']),
                                partner: message.guild.members.cache.get(db['partner']),
                                channel: message.guild.channels.cache.get(db['channel']),
                            }
                            var
                                author,
                                partner;

                            if (db['type'].toLowerCase() == "✅") {
                                const filter = (reaction, user) => ['✊', '📰', '✂️'].includes(reaction.emoji.name);
                                game.author.send(`**What is your choice (✊, 📰, ✂️), You've 30secs**`).then(async msg => {
                                    for (const reaction of reactions) await msg.react(reaction);
                                    let collector = msg.createReactionCollector({ filter, time: 30000 });
                                    collector.on('collect', (reaction, user) => {
                                        if (user.id === game.author.user.id) {
                                            author = reaction.emoji.name
                                            collector.stop();
                                        }
                                    });
                                    collector.on('end', collected => {
                                        if (author) {
                                            if (partner) {
                                                getResult(partner, author, game.channel, message, member)
                                            } else {
                                                msg.channel.send(`Waiting for your partner to choose!`)
                                            }
                                        } else game.channel.send(`${message.author} **Timeout didn't choose reaction**`)
                                    });
                                })
                                game.partner.send(`**What is your choice (✊, 📰, ✂️), You've 30secs**`).then(async msg => {
                                    let collector = msg.createReactionCollector({ filter, time: 30000 });
                                    for (const reaction of reactions) await msg.react(reaction);
                                    collector.on('collect', (reaction, user) => {
                                        if (user.id === game.partner.user.id) {
                                            partner = reaction.emoji.name
                                            collector.stop();
                                        }
                                    });
                                    collector.on('end', collected => {
                                        if (partner) {
                                            if (author) {
                                                getResult(partner, author, game.channel, message, member)
                                            } else {
                                                msg.channel.send(`Waiting for your partner to choose!`)
                                            }
                                        } else game.channel.send(`${member} **Timeout didn't choose reaction**`)
                                    });
                                })
                            } else {
                                game.channel.send(`${game.partner} Declined to play with you.`);
                                database.delete(`${game.author.id}${game.partner.id}`);
                            }
                        } else message.channel.send(`**Challenge request timeout..**`)
                    });
                })
            }
        }
    }
});

client.login(config.token);