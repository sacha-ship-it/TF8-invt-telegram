const TelegramBot = require("node-telegram-bot-api")

const TOKEN = process.env.TOKEN
const GROUP_ID = process.env.GROUP_ID

const bot = new TelegramBot(TOKEN, { polling: true })

const inviteLinks = new Map()
const inviteCount = new Map()
let dataMessageId = null

const PRIZES = {
  1: "$50,000 Instant or 2-Step Account — Your choice 🏆",
  2: "$10,000 Instant or 2-Step Account 🥈",
  3: "$5,000 Instant or 2-Step Account 🥉"
}

const TARGET = 1000

// ─────────────────────────────────────────
// SAUVEGARDE
// ─────────────────────────────────────────

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
    console.error("Erreur sauvegarde:", e.message)
  }
}

// ─────────────────────────────────────────
// /start — Message de bienvenue
// ─────────────────────────────────────────

bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name

  const welcomeText = `
👋 Welcome to The Floor 8 Invitation Contest !

🏆 *PRIZES TO WIN*
🥇 1st place → ${PRIZES[1]}
🥈 2nd place → ${PRIZES[2]}
🥉 3rd place → ${PRIZES[3]}

🎯 *HOW IT WORKS*
Invite as many people as possible to the group using your unique link. The top 3 inviters when we reach *${TARGET} members* win their prize.

📋 *COMMANDS*
/monlien — Get your unique invitation link
/mesinfos — See your stats and current rank
/classement — Top 10 leaderboard

Let's go 🚀
`

  bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: "Markdown" })
})

// ─────────────────────────────────────────
// /monlien — Lien d'invitation unique
// ─────────────────────────────────────────

bot.onText(/\/monlien/, async (msg) => {
  const userId = msg.from.id
  const username = msg.from.username || msg.from.first_name

  if (inviteLinks.has(userId)) {
    const existing = inviteLinks.get(userId)
    const count = inviteCount.get(userId)?.count || 0
    const rank = getRank(userId)
    return bot.sendMessage(msg.chat.id,
      `🔗 *Your invitation link :*\n${existing.link}\n\n📊 Invitations : *${count}*\n🏅 Current rank : *#${rank || "?"}*\n\nShare it and climb the leaderboard ! 🚀`,
      { parse_mode: "Markdown" }
    )
  }

  try {
    const invite = await bot.createChatInviteLink(GROUP_ID, {
      name: `Invite de ${username}`,
      creates_join_request: false,
      member_limit: 999
    })

    inviteLinks.set(userId, {
      link: invite.invite_link,
      username,
      inviteCode: invite.invite_link.split("/").pop()
    })

    if (!inviteCount.has(userId)) {
      inviteCount.set(userId, { count: 0, username })
    }

    await saveData()

    bot.sendMessage(msg.chat.id,
      `🔗 *Your unique invitation link :*\n${invite.invite_link}\n\nShare it to climb the leaderboard and win your prize 🏆`,
      { parse_mode: "Markdown" }
    )
  } catch (e) {
    console.error("Erreur création lien:", e.message)
    bot.sendMessage(msg.chat.id, "❌ Error creating your link. Please try again.")
  }
})

// ─────────────────────────────────────────
// /mesinfos — Stats personnelles
// ─────────────────────────────────────────

bot.onText(/\/mesinfos/, (msg) => {
  const userId = msg.from.id
  const data = inviteCount.get(userId)
  const count = data ? data.count : 0
  const rank = getRank(userId)
  const prize = PRIZES[rank] || "Keep inviting to win a prize !"

  let text = `📊 *Your stats :*\n\n`
  text += `👥 Invitations : *${count}*\n`
  text += `🏅 Current rank : *#${rank || "?"}*\n`

  if (rank && rank <= 3) {
    text += `\n🎁 *Current prize :* ${prize}`
  } else {
    text += `\n🎯 Keep going — top 3 wins a prize !`
  }

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" })
})

// ─────────────────────────────────────────
// /classement — Top 10
// ─────────────────────────────────────────

bot.onText(/\/classement/, (msg) => {
  const top = [...inviteCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  if (top.length === 0) {
    return bot.sendMessage(msg.chat.id, "No invitations yet. Be the first ! 🚀")
  }

  const medals = ["🥇", "🥈", "🥉"]
  let text = `🏆 *INVITATION CONTEST — TOP 10*\n\n`
  text += `🎯 Contest ends at *${TARGET} members*\n\n`

  top.forEach(([id, data], i) => {
    const rank = medals[i] || `${i + 1}.`
    const prize = PRIZES[i + 1] ? `— ${PRIZES[i + 1].split("—")[0].trim()}` : ""
    text += `${rank} @${data.username} : *${data.count} invitation${data.count > 1 ? "s" : ""}* ${prize}\n`
  })

  text += `\n/monlien to get your unique link 🔗`

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" })
})

// ─────────────────────────────────────────
// DÉTECTION NOUVEAUX MEMBRES
// ─────────────────────────────────────────

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
        `📨 *${newMembers.map(m => m.first_name).join(", ")}* joined via *@${data.username}*'s link !\n📊 @${data.username} : *${newCount} invitation${newCount > 1 ? "s" : ""}* | Rank : *#${rank || "?"}*`,
        { parse_mode: "Markdown" }
      )
      break
    }
  }
})

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

function getRank(userId) {
  const sorted = [...inviteCount.entries()].sort((a, b) => b[1].count - a[1].count)
  const rank = sorted.findIndex(([id]) => id === userId) + 1
  return rank || null
}

// ─────────────────────────────────────────
// DÉMARRAGE
// ─────────────────────────────────────────

console.log("Bot TF8 Invitations Telegram démarré !")
