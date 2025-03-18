import { Injectable } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";

@Injectable()
export class BotService {
  private bot: TelegramBot;
  private userSessions: Record<
    number,
    {
      questions: { question: string; answer: number }[];
      correctAnswers: number;
      currentIndex: number;
    }
  > = {};

  constructor() {
    if (!process.env.BOT_TOKEN) {
      throw new Error(
        "BOT_TOKEN aniqlanmadi. Iltimos, .env faylni tekshiring."
      );
    }

    this.bot = new TelegramBot(process.env.BOT_TOKEN as string, {
      polling: true,
    });
    this.initializeBot();
  }
  

  private generateQuestion() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const ishora = ["+", "-", "*", "/"];
    const bittasi = Math.floor(Math.random() * 4);
    const middle = ishora[bittasi];
    let answer: number =  0;
    switch (middle) {
        case "+":
            answer = a + b;
            break;
        case "-":
            answer = a - b;
            break;
        case "*":
            answer = a * b;
            break;
        case "/":
            answer = b !== 0 ? Math.floor(a / b) : 0; // Nolga bo'lishni oldini olish
            break;
    }
    return {
        question: `${a} ${middle} ${b} = ?`,
        answer: answer,
    };
  }

  private initializeBot() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.userSessions[chatId] = {
        questions: [],
        correctAnswers: 0,
        currentIndex: 0,
      };

      const keyboard:object = {
        reply_markup: {
          keyboard: [["📚 Quizni boshlash"]],
          resize_keyboard: true, // Kichik klaviatura
          one_time_keyboard: false, // Tugma doim ko‘rinib turadi
        },
      };
      this.bot.sendMessage(chatId, 
        "Salom! Sizga 10 ta misol beriladi. Boshlash uchun pastdagi '📚 Quizni boshlash' tugmasini bosing.", keyboard);
    });

    this.bot.onText(/📚 Quizni boshlash/, (msg) => {
      const chatId = msg.chat.id;
      this.userSessions[chatId] = {
        questions: [],
        correctAnswers: 0,
        currentIndex: 0,
      };

      for (let i = 0; i < 10; i++) {
        this.userSessions[chatId].questions.push(this.generateQuestion());
      }

      this.bot.sendMessage(
        chatId,
        "Birinchi savol: " + this.userSessions[chatId].questions[0].question
      );
    });

    this.bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      const userSession = this.userSessions[chatId];

      if (
        !userSession ||
        userSession.questions.length === 0 ||
        isNaN(Number(msg.text))
      ) {
        return;
      }

      const currentQuestion = userSession.questions[userSession.currentIndex];
      if (parseInt(msg.text as any) === currentQuestion.answer) {
        userSession.correctAnswers++;
      }

      userSession.currentIndex++;

      if (userSession.currentIndex < userSession.questions.length) {
        this.bot.sendMessage(
          chatId,
          `${userSession.currentIndex + 1}-savol: ` +
            userSession.questions[userSession.currentIndex].question
        );
      } else {
        this.bot.sendMessage(
          chatId,
          `Test tugadi! Siz ${userSession.correctAnswers}/10 to'g'ri javob berdingiz.`
        );
        delete this.userSessions[chatId];
      }
    });
  }
}