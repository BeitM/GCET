'use client';

import { useRouter } from 'next/navigation';

export default function Landing() {
  const router = useRouter();

  const cardConfig = [
    {
      id: 'student',
      icon: '🎓',
      title: 'I am a Student',
      description: 'Learn robotics fundamentals, programming, and competition strategies with AI guidance',
      button: 'Start Learning',
      bgGlow: 'from-blue-600/20 to-cyan-600/20',
      borderHover: 'group-hover:border-blue-500/50',
      shadowHover: 'hover:shadow-blue-500/20',
      role: 'student',
    },
    {
      id: 'coach',
      icon: '👨‍🏫',
      title: 'I am a Coach',
      description: 'Manage teams, review robot design and code, and generate competition strategies',
      button: 'Enter Coaching Dashboard',
      bgGlow: 'from-purple-600/20 to-pink-600/20',
      borderHover: 'group-hover:border-purple-500/50',
      shadowHover: 'hover:shadow-purple-500/20',
      role: 'coach',
    },
  ];

  return (
    <div className="app-shell flex flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-20">
        <div className="mb-12 max-w-2xl text-center sm:mb-16">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            AI Robotics Trainer
          </h1>
          <p className="text-lg leading-relaxed text-gray-300 sm:text-xl">
            Learn robotics faster with AI coaching, simulation tools, and real-time feedback.
          </p>
        </div>

        <div className="mb-12 grid w-full max-w-4xl grid-cols-1 gap-6 sm:mb-16 sm:gap-8 md:grid-cols-2">
          {cardConfig.map((card) => {
            const cardGlowClass = `absolute inset-0 rounded-2xl bg-gradient-to-r ${card.bgGlow} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100`;
            const cardPanelClass = `relative flex h-full flex-col rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8 transition-all duration-300 sm:p-10 ${card.borderHover} ${card.shadowHover} hover:shadow-2xl`;
            const actionClassName = card.id === 'student'
              ? 'rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition-all duration-300 group-hover:bg-blue-500'
              : 'rounded-lg bg-purple-600 px-6 py-3 text-center font-semibold text-white transition-all duration-300 group-hover:bg-purple-500';

            return (
              <button
                key={card.id}
                onClick={() => router.push(`/login?role=${card.role}`)}
                className="group relative h-full"
              >
                <div className={cardGlowClass}></div>

                <div className={cardPanelClass}>
                  <div className="mb-6 text-5xl sm:text-6xl">{card.icon}</div>

                  <h3 className="mb-4 text-left text-2xl font-bold text-white sm:text-3xl">
                    {card.title}
                  </h3>

                  <p className="mb-8 flex-grow text-left text-base text-gray-300 sm:text-lg">
                    {card.description}
                  </p>

                  <div className={actionClassName}>{card.button}</div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-gray-800 px-4 py-6">
        <p className="text-center text-sm text-gray-500">Powered by AI robotics coaching system</p>
      </footer>
    </div>
  );
}
