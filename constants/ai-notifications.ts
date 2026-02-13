export interface AINotificationMessage {
  title: string;
  body: string;
}

export const AI_COACH_MORNING_MESSAGES: AINotificationMessage[] = [
  { title: "Rise & Conquer", body: "Your morning energy is your superpower. Let's knock out today's tasks while you're at peak focus." },
  { title: "Good morning!", body: "New day, new wins. Your tasks are ready — let's make today count." },
  { title: "Time to shine", body: "The most successful people start their mornings with intention. Ready to check off some tasks?" },
  { title: "Your morning window is open", body: "This is your prime time for deep work. Don't let it slip — open your tasks now." },
  { title: "Fresh start", body: "Yesterday is done. Today's tasks are waiting for you. Let's build momentum!" },
  { title: "Morning check-in", body: "Quick reminder: your goals don't achieve themselves. But you've got this — start now." },
  { title: "Early bird wins", body: "You chose mornings for a reason. Your brain is sharp right now — use it!" },
  { title: "Let's go!", body: "Coffee's ready, tasks are set. Time to make progress on your goals." },
];

export const AI_COACH_AFTERNOON_MESSAGES: AINotificationMessage[] = [
  { title: "Afternoon power hour", body: "This is your peak zone. Let's turn this energy into completed tasks." },
  { title: "Time to focus", body: "The afternoon is when you do your best work. Your tasks are waiting!" },
  { title: "Midday momentum", body: "Half the day is gone — but your best hours are right now. Let's make them count." },
  { title: "Your golden hours", body: "You picked afternoons as your prime time. Don't waste it — start your tasks now." },
  { title: "Quick check-in", body: "Hey! How's the day going? Your tasks could use some attention right about now." },
  { title: "Afternoon boost", body: "This is when your focus peaks. Channel it into your goals — open your tasks." },
  { title: "Let's crush it", body: "The afternoon stretch is yours. Time to turn plans into progress!" },
  { title: "Focus time", body: "Distractions down, productivity up. Your tasks are ready when you are." },
];

export const AI_COACH_EVENING_MESSAGES: AINotificationMessage[] = [
  { title: "Evening focus time", body: "The day's noise is fading. Perfect time to dive into your tasks with full attention." },
  { title: "Night owl mode", body: "Your peak hours are here. Let's use this quiet time to make real progress." },
  { title: "Your prime time is now", body: "Evenings are when you shine. Open your tasks and let's get to work." },
  { title: "Wind down productively", body: "Before the day ends — let's check off a few tasks. You'll sleep better knowing you made progress." },
  { title: "Evening check-in", body: "Hey! Your best focus window is open. Don't let it close without some wins." },
  { title: "Quiet hours, big progress", body: "The world slows down, but you speed up. Time to tackle those tasks." },
  { title: "End the day strong", body: "A productive evening sets up a great tomorrow. Let's do this." },
  { title: "Night session", body: "You chose evenings for deep work. The time is now — your tasks await." },
];

export const AI_COACH_INCOMPLETE_TASKS_MESSAGES: AINotificationMessage[] = [
  { title: "Tasks still waiting", body: "You've got unfinished tasks today. Even completing just one builds momentum. Let's go!" },
  { title: "Don't break the streak", body: "Your consistency matters more than perfection. Open the app and check off what you can." },
  { title: "Quick win available", body: "Some of today's tasks are still open. A small effort now = a big win for your streak." },
  { title: "Friendly nudge", body: "Hey, looks like some tasks need your attention. Even 5 minutes of progress counts!" },
  { title: "Almost there", body: "You're closer than you think. Just a few tasks left — let's finish strong." },
  { title: "Don't let today slip", body: "Your future self will thank you. Open the app and complete at least one task." },
  { title: "Consistency is key", body: "Small daily actions create big results. Your tasks are waiting — make today count." },
  { title: "Last call for today", body: "The day's not over yet! There's still time to make progress on your goals." },
];

export const AI_COACH_ALL_DONE_MESSAGES: AINotificationMessage[] = [
  { title: "Amazing work!", body: "All tasks done for today! You're building an unstoppable habit. Keep it up!" },
  { title: "You crushed it!", body: "Every task checked off. This is what consistent growth looks like." },
  { title: "Goal machine", body: "Today's tasks? Done. You're one day closer to your goal. Rest well!" },
];

export function getRandomMessage(messages: AINotificationMessage[]): AINotificationMessage {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

export function getMessagesForProductivityTime(
  productivityTime: 'morning' | 'afternoon' | 'evening' | 'unknown' | undefined
): AINotificationMessage[] {
  switch (productivityTime) {
    case 'morning':
      return AI_COACH_MORNING_MESSAGES;
    case 'afternoon':
      return AI_COACH_AFTERNOON_MESSAGES;
    case 'evening':
      return AI_COACH_EVENING_MESSAGES;
    default:
      return AI_COACH_MORNING_MESSAGES;
  }
}

export function getNotificationHoursForProductivity(
  productivityTime: 'morning' | 'afternoon' | 'evening' | 'unknown' | undefined
): { mainHour: number; mainMinute: number; followUpHour: number; followUpMinute: number } {
  switch (productivityTime) {
    case 'morning':
      return { mainHour: 8, mainMinute: 0, followUpHour: 12, followUpMinute: 0 };
    case 'afternoon':
      return { mainHour: 13, mainMinute: 0, followUpHour: 17, followUpMinute: 30 };
    case 'evening':
      return { mainHour: 19, mainMinute: 0, followUpHour: 21, followUpMinute: 30 };
    default:
      return { mainHour: 9, mainMinute: 0, followUpHour: 13, followUpMinute: 0 };
  }
}
