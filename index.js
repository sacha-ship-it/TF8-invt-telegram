const TelegramBot = require("node-telegram-bot-api")

const TOKEN = process.env.TOKEN
const GROUP_ID = process.env.GROUP_ID

const bot = new TelegramBot(TOKEN, { polling: true })

const inviteLinks = new Map()
const inviteCount = new Map()
let dataMessageId = null

const PRIZES = {
  1: "$50,000 Instant or 2-Step Account — Your choice",
  2: "$10,000 Instant or 2-Step Account",
  3: "$5,000 Instant or 2-Step Account"
}

const TARGET = 1000

async function saveData() {
  try {
    const data = JSON.stringify({
      inviteLinks: Object.fromEntries(inviteLinks),
      inviteCount: Object.fromEntries(inviteCount)
    })
    if (dataMessageId) {
      await bot.editMessageText("TFDATA:" + data, {
        chat_id: GROUP_ID,
        message_id: dataMessageId
      })
    } else {
      const msg = await bot.sendMessage(GROUP_ID, "TFDATA:" + data)
      dataMessageId = msg.message_id
    }
  } catch (e) {
    console.error("Save error:", e.message)
  }
}

function getRank(userId) {
  const sorted = [...inviteCount.entries()].sort((a, b) => b[1].count - a[1].count)
  const rank = sorted.findIndex(([id]) => id === userId) + 1
  return rank || null
}

bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name

  let link = null

  if (inviteLinks.has(userId)) {
    link = inviteLinks.get(userId).link
  } else {
    try {
      const invite = await bot.createChatInviteLink(GROUP_ID, {
        name: `Invite de ${username}`,
        creates_join_request: false,
        member_limit: 999
      })
      link = invite.invite_link
      inviteLinks.set(userId, {
        link,
        username,
        inviteCode: link.split("/").pop()
      })
      inviteCount.set(userId, { count: 0, username })
      await saveData()
    } catch (e) {
      console.error("Link error:", e.message)
    }
  }

  const text = `
TF8 - Invitation Contest

🎉 WELCOME TO THE TF8 INVITATION CONTEST !

You're in ! Now it's time to bring your network to The Floor 8 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 YOUR PERSONAL INVITE LINK :
${link || "Type /mylink to get your link"}

Share this link — every person who joins through it counts as your invite.

━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 HOW IT WORKS :
1. Share your link
2. Each friend who joins = +1 invitation
3. The more you invite, the higher you climb 🏆

━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 PRIZES :
🥇 1st place : ${PRIZES[1]}
🥈 2nd place : ${PRIZES[2]}
🥉 3rd place : ${PRIZES[3]}

Contest ends when the group reaches ${TARGET} members 👀

━━━━━━━━━━━━━━━━━━━━━━━━━

📊 COMMANDS :
/mylink - Your unique invitation link
/mystats - Your invitations and current rank
/leaderboard - Top 10 leaderboard

Start sharing now ! 🚀
`

  bot.sendMessage(msg.chat.id, text)
})

bot.onText(/\/mylink/, async (msg) => {
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name

  let link = null

  if (inviteLinks.has(userId)) {
    link = inviteLinks.get(userId).link
  } else {
    try {
      const invite = await bot.createChatInviteLink(GROUP_ID, {
        name: `Invite de ${username}`,
        creates_join_request: false,
        member_limit: 999
      })
      link = invite.invite_link
      inviteLinks.set(userId, {
        link,
        username,
        inviteCode: link.split("/").pop()
      })
      inviteCount.set(userId, { count: 0, username })
      await saveData()
    } catch (e) {
      console.error("Link error:", e.message)
    }
  }

  const count = inviteCount.get(userId)?.count || 0
  const rank = getRank(userId)

  const text = `
TF8 - Invitation Contest

🔗 YOUR PERSONAL INVITE LINK :
${link}

━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Your invitations : ${count}
🏅 Current rank : #${rank || "?"}

Share your link and climb the leaderboard 🚀
`

  bot.sendMessage(msg.chat.id, text)
})

bot.onText(/\/mystats/, (msg) => {
  const userId = msg.from.id
  const data = inviteCount.get(userId)
  const count = data ? data.count : 0
  const rank = getRank(userId)
  const prize = PRIZES[rank] || null

  let text = `
TF8 - Invitation Contest

📊 YOUR STATS :

👥 Invitations : ${count}
🏅 Current rank : #${rank || "?"}
`

  if (rank && rank <= 3) {
    text += `\n🎁 Current prize : ${prize}`
  } else {
    text += `\n🎯 Keep going — top 3 wins a funded account !`
  }

  text += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n/mylink to share your link 🔗`

  bot.sendMessage(msg.chat.id, text)
})

bot.onText(/\/leaderboard/, (msg) => {
  const top = [...inviteCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  if (top.length === 0) {
    return bot.sendMessage(msg.chat.id, "No invitations yet. Be the first ! 🚀")
  }

  const medals = ["🥇", "🥈", "🥉"]

  let text = `TF8 - Invitation Contest\n\n🏆 TOP 10 LEADERBOARD\n\n🎯 Contest ends at ${TARGET} members\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  top.forEach(([id, data], i) => {
    const rank = medals[i] || `${i + 1}.`
    const prize = PRIZES[i + 1] ? `${PRIZES[i + 1].split(" ")[0]} ${PRIZES[i + 1].split(" ")[1]}` : ""
    text += `${rank} @${data.username} : ${data.count} invitation${data.count > 1 ? "s" : ""} ${prize ? `| ${prize}` : ""}\n`
  })

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n/mylink to get your unique link 🔗`

  bot.sendMessage(msg.chat.id, text)
})

bot.on("new_chat_members", async (msg) => {
  const newMembers = msg.new_chat_members
  const inviteLink = msg.invite_link

  if (!inviteLink) return

  const inviteCode = inviteLink.invite_link?.split("/").pop()

  for (const [userId, data] of inviteLinks.entries()) {
    if (data.inviteCode === inviteCode) {
      const current = inviteCount.get(userId) || { count: 0, username: data.username }
      const newCount = current.count + newMembers.length
      inviteCount.set(userId, { count: newCount, username: data.username })

      await saveData()

      const rank = getRank(userId)

      bot.sendMessage(GROUP_ID,
        `📨 ${newMembers.map(m => m.first_name).join(", ")} joined via @${data.username}'s link !\n📊 @${data.username} : ${newCount} invitation${newCount > 1 ? "s" : ""} | Rank : #${rank || "?"}`
      )
      break
    }
  }
})

console.log("TF8 Invitation Bot started !")
