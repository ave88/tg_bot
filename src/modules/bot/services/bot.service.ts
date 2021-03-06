import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from 'nestjs-config'
import TelegramBot, {
  AnswerCallbackQueryOptions,
  CallbackQuery,
  Message,
  SendMessageOptions
} from 'node-telegram-bot-api'
import { Subject } from 'rxjs/internal/Subject'
import { BotCallbackQueryController, BotTextController } from 'src/modules/bot/controllers'
import { Message as IMessageSchema } from 'src/modules/message/interfaces'
import { MessageService } from 'src/modules/message/services'

@Injectable()
export class BotService implements OnModuleInit {
  private readonly bot: TelegramBot
  private readonly messagesSubject: Subject<IMessageSchema[]> = new Subject()

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => BotTextController))
    private readonly botTextController: BotTextController,
    @Inject(forwardRef(() => BotCallbackQueryController))
    private readonly botCallbackQueryController: BotCallbackQueryController,
    private readonly messageService: MessageService
  ) {
    this.bot = new TelegramBot(this.configService.get('bot.token'), { polling: true })

    this.initBot()
  }

  async onModuleInit(): Promise<any> {
    const messages = await this.messageService.getMany()
    this.messagesSubject.subscribe(this.messageScheduler)
    this.messagesSubject.next(messages)
  }

  initBot() {
    this.bot.on('text', async (msg: Message) => {
      Logger.log(msg, 'BOT EVENT TEXT msg:')

      await this.botTextController.handleMessage(msg)
    })

    this.bot.on('callback_query', async (query: CallbackQuery) => {
      Logger.log(query, 'BOT EVENT CALLBACK QUERY query:')

      await this.botCallbackQueryController.handleCallbackQuery(query)
    })
  }

  async sendMessage(chatId: number, text: string, options?: SendMessageOptions): Promise<Message> {
    return this.bot.sendMessage(chatId, text, options)
  }

  async deleteMessage(chatId: number, messageId: string): Promise<any> {
    return this.bot.deleteMessage(chatId, messageId)
  }

  async answerCallbackQuery(callbackQueryId: string, options?: Partial<AnswerCallbackQueryOptions>): Promise<boolean> {
    return this.bot.answerCallbackQuery(callbackQueryId, options)
  }

  pushMessages(messages: IMessageSchema[]) {
    this.messagesSubject.next(messages)
  }

  async messageScheduler(data: IMessageSchema[]) {
    console.log({ data })
  }
}
