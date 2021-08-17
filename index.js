const Discord = require('discord.js')
  const client = new Discord.Client()
    var PREFIX = '!'
      const ytdl = require('ytdl-core');
        const ytSearch = require('yt-search');
          const queue = new Map();

const { token } = require('./config.json')

client.on('ready', () => {
    console.log(`Client login as ${client.user.tag}`)
})

client.on('message', async message => {
    if(!message.guild) return;
    let parts = message.content.split(" ")

    if(parts[0] == PREFIX + 'play' || parts[0] == PREFIX + 'stop' || parts[0] == PREFIX + 'skip') {
        message.delete()
        const voiceChannel = message.member.voice.channel;

        if(!voiceChannel) return message.channel.send('ohne channel keine musik!')
        const permissions = voiceChannel.permissionsFor(message.client.user)
        if(!permissions.has('CONNECT')) return message.channel.send('Du hast nicht die berechtigung!')
        if(!permissions.has('SPEAK')) return message.channel.send('Du hast nicht die berechtigung!')
        
        const server_queue = queue.get(message.guild.id);

        if(parts[0] == PREFIX + 'play') {
            if(!parts[1]) return message.channel.send('Du musst deine musik richtung noch angeben!')
            let song = {};

            if(ytdl.validateURL(parts[0])) {
                const song_info = await ytdl.getInfo(parts[0]);
                song = { tytle: song_info.videoDetails.title, url: song_info.videoDetails.video_url}
            } else {
                const video_finder = async (query) => {
                    const videoResult = await ytSearch(query);
                    return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
                }

                const video = await video_finder(parts.join(" "));
                if(video) {
                    song = { title: video.title, url: video.url }
                } else {
                    message.reply('Kein gültiges video gefunden')
                }
            }

            if(!server_queue) {
                const queue_constructer = {
                    voice_channel: voiceChannel,
                    text_channel: message.channel,
                    connection: null,
                    songs: []
                }
    
                queue.set(message.guild.id, queue_constructer)
                queue_constructer.songs.push(song);
    
                try {
                    const connection = await voiceChannel.join();
                    queue_constructer.connection = connection;
                    video_player(message.guild, queue_constructer.songs[0]);
                } catch (err) {
                    queue.delete(message.guild.id);
                    message.channel.send('ERROR! (CONNECTION)');
                    throw err;
                }
            } else {
                server_queue.songs.push(song);
                return message.reply(`**${song.title}** wurde zur playlist hinzugefügt!`)
            }
        }
        else if(parts[0] == PREFIX + 'skip') skip_song(message, server_queue);
        else if(parts[0] == PREFIX + 'stop') stop_song(message, server_queue);
    }
})

const video_player = async (guild, song) => {
    const song_queue = queue.get(guild.id);
    if(!song) {
        song_queue.voice_channel.leave();
        queue.delete(guild.id);
        return;
    }
    const stream = ytdl(song.url, { filter: 'audioonly' });
    song_queue.connection.play(stream, { seek: 0, volume: 5 })
    .on('finish', () => {
        song_queue.songs.shift();
        video_player(guild, song_queue.songs[0]);
    });
    await song_queue.text_channel.send(`Es wird gespielt : **${song.title}**`)
}

const skip_song = (message, server_queue) => {
    if(!message.member.voice.channel) return message.reply('ohne channel keine musik!')
    if(!server_queue) {
        return message.reply('Es befinden sich keine Songs in der Playlist!')
    }
    server_queue.connection.dispatcher.end();
}

const stop_song = (message, server_queue) => {
    if(!message.member.voice.channel) return message.reply('ohne channel keine musik!')
    server_queue.songs = [];
    server_queue.connection.dispatcher.end();
}

client.login(token)