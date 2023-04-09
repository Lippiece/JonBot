import TelegramBot from 'node-telegram-bot-api'
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

const token = process.env.TOKEN

// включаем самого робота
const bot = new TelegramBot(token, {polling: true})

let mode = 0           //режим бота

let seconds_counter = 0
let pause_param = 0
let seconds_counter_paused = 0

let fullBlockTime = 10
let breakTime = 5

let nextBlock = 0

let tasks = []

let tasksRelaxationKeyboard = ['игры', 'ДнД', 'домашняя рутина']
let tasksStudyKeyboard = ['английский язык', '1С', 'С++', 'UE4']
let tasksLeisureKeyboard = ['спорт', 'сон', 'чтение', 'иное']

let tasks_keyboard = [
	tasksRelaxationKeyboard,
	tasksStudyKeyboard,
	tasksLeisureKeyboard
]

//[['отдых'], ['обучение и скилы'], ['досуг']]

let settings_keyboard = [/*['#список'],*/['#время'], ['#выйти из настроек']]
let settings_time_keyboard = [['#время рабочего блока'], ['#время перерывов между блоками'], ['#назад']]

//let settings_tasks_keyboard = ['#список', '#время', '#выйти из настроек']

//bot.sendMessage(chatId, "!!!", {
//    reply_markup: {
//        inline_keyboard: [
//            [{
//                text: 'test1',
//                callback_data: '1'
//            }],
//            [{
//                text: 'test2',
//                callback_data: '2'
//            }]
//        ]
//    }
//})
//

//********FUNCTIONS BLOCK************

function setUpBlocks(newtask) {
	tasks[tasks.length] = newtask
}

function deleteLastMessages(chatId, msgId) {
	bot.deleteMessage(chatId, msgId)
}

function pause() {
	pause_param = 1
}

function unPause() {
	pause_param = 0
}

function prepMinute(chatId, msgId, working = 0) {
	let prepminute = setInterval(() => {
		if (working === 1) {
			if (pause_param === 0) {
				seconds_counter += 1
				console.log("Prep " + seconds_counter)
			} else {
				seconds_counter_paused += 1
			}
			if (seconds_counter === breakTime) {
				seconds_counter = 0
				startBlock(chatId)
				clearInterval(prepminute)
				console.log("prepminute СБРОШЕН")
				return (bot.sendMessage(chatId, "Начинается блок " + nextBlock + "!"))
			}
		} else {
			console.log("prepminute СБРОШЕН")
			clearInterval(prepminute)
		}
	}, 1000)
}

function startBlock(chatId, msgId, working = 0) {
	let block = nextBlock
	let startblock = setInterval(() => {
		if (working === 1) {
			if (pause_param === 0) {
				seconds_counter += 1
				console.log("Start " + seconds_counter)
			} else {
				seconds_counter_paused += 1
			}
			if (seconds_counter === fullBlockTime) {
				seconds_counter = 0
				clearInterval(startblock)
				console.log("startblock СБРОШЕН")
				mode = "choosing"
				chooseTime(chatId, msgId)
				return (bot.sendMessage(chatId, "Блок " + block + " завершился. Какой будет следующий?", {
					reply_markup: {
						keyboard: tasks_keyboard
					}
				}))

			}
		} else {
			console.log("startblock СБРОШЕН")
			clearInterval(startblock)
		}
	}, 1000)
}

function chooseTime(chatId, msgId, working = 0) {
	nextBlock = 0
	let choosetime = setInterval(() => {
		if (working === 1) {
			if (pause_param === 0) {
				seconds_counter += 1
				console.log("Choose " + seconds_counter)
			} else {
				seconds_counter_paused += 1
			}
			if (seconds_counter === (breakTime - 1)) {
				if (nextBlock === 0) {
					pause()
				}
			}
			if (seconds_counter === breakTime) {
				seconds_counter = 0
				clearInterval(choosetime)
				console.log("choosetime СБРОШЕН")
				prepMinute(chatId)
				return (bot.sendMessage(chatId, "Блок " + nextBlock + " начнется через минуту!", {
					reply_markup: {
						keyboard: [['#пауза'], ['#настройки']]
						//remove_keyboard: true
					}
				}))
			}
		} else {
			console.log("choosetime СБРОШЕН")
			clearInterval(choosetime)
		}
	}, 1000)
}


let stage = "block" //prep,choose

//************************************

bot.on('message', (message) => {
	const text = message.text
	const chatId = message.chat.id
	const msgId = message.message_id

	const modeChooser = {
		"fullTimeSettings": () => {
		},
		"breakTimeSettings": () => {
		},
		"choosing": () => {
		},
		"settings": () => {
		},
		0: () => {
		}
	}

	if (mode === 'fullTimeSettings') {

		if (parseInt(text)) {
			console.log('loh')
			fullBlockTime = parseInt(text)
			bot.sendMessage(chatId, "Настройки: ", {
				reply_markup: {
					keyboard: settings_time_keyboard

				}
			})
		}

		mode = 'settings'
	}
	if (mode === 'breakTimeSettings') {

		breakTime = parseInt(text)
		bot.sendMessage(chatId, "Настройки: ", {
			reply_markup: {
				keyboard: settings_time_keyboard

			}
		})
		mode = 'settings'
	}
	if (mode === 'choosing') {

		nextBlock = text
		mode = 0
		unPause()
	}
	if (mode === 0) {//команды
		const act = async action => {
			const {message, replyMarkup, working} = action
			action.actionFunction(chatId, msgId, working)
			replyMarkup && await bot.sendMessage(chatId, message, {reply_markup: replyMarkup})
		}

		const Action = (actionFunction,
						message = "Сообщение не задано",
						replyMarkup = {},
						working = 0,
						mode = 0) =>
			({
				actionFunction,
				message,
				replyMarkup,
				working,
				mode
			});

		const actions = {
			'#пауза': new Action(
				pause,
				'Пауза отжата',
				{
					keyboard: [['#пауза'], ['#продолжить']]
				}),
			'#продолжить': new Action(
				unPause,
				'Пауза отжата',
				{
					keyboard: [['#пауза'], ['#продолжить']]
				}),
			'#запуск': new Action(
				chooseTime,
				'Выберите первый блок',
				{
					keyboard: tasks_keyboard
				},
				1,
				"choosing"
			),
			'#конецблока': new Action(
				() => {
				},
				`END :${seconds_counter_paused}`,
			),
			'#настройки': new Action(
				pause,
				'Настройки',
				{
					keyboard: settings_keyboard
				}
			)
		}

		actions[text]
			? act(action)
			:
			bot.sendMessage(chatId, 'Неизвестная команда', {
				reply_markup: {
					keyboard: tasks_keyboard
				}
			})

	} else { //modes

		if (mode === 'settings') {

			if (text === '#список') {

				bot.sendMessage(chatId, "Редактирование списка блоков", {
					reply_markup: {
						keyboard: [['#добавить блок', '#удалить блок', '#назад']]
					}
				})
			}
			if (text === '#время') {


				bot.sendMessage(chatId, "Редактирование времени блоков", {
					reply_markup: {
						keyboard: settings_time_keyboard

					}
				})
			}
			if (text === '#время рабочего блока') {

				mode = 'fullTimeSettings'
				bot.sendMessage(chatId, "Введите новое время в минутах", {
					reply_markup: {
						remove_keyboard: true
					}
				})
			}
			if (text === '#время перерывов между блоками') {


				mode = 'breakTimeSettings'
				bot.sendMessage(chatId, "Введите новое время в минутах", {
					reply_markup: {
						remove_keyboard: true
					}
				})
			}
			if (text === '#назад') {


				//mode = 0
				bot.sendMessage(chatId, "Пауза", {
					reply_markup: {
						keyboard: settings_keyboard

					}
				})
			}
			if (text === '#выйти из настроек') {

				mode = 0
				bot.sendMessage(chatId, "Поставлена пауза", {
					reply_markup: {
						keyboard: [['#продолжить'], ['#настройки']]
					}
				})
			}
		}

	}
})
