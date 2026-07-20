'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';

export default function StudentDashboard() {
  const { t } = useTranslation();
  const sessions = [
    { date: t('tomorrow'), time: '2:00 PM', type: t('robotProgramming'), coach: 'Coach Miller' },
    { date: t('thursday'), time: '3:30 PM', type: t('mechanicalDesign'), coach: 'Coach Miller' },
    { date: t('saturday'), time: '10:00 AM', type: t('competitionPrep'), coach: 'Coach Miller' },
  ];
  const skills = [
    { skill: t('programming'), progress: 85 },
    { skill: t('mechanicalDesign'), progress: 72 },
    { skill: t('electronics'), progress: 90 },
    { skill: t('cadDesign'), progress: 65 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white border-b border-emerald-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">{t('teamMemberDashboard')}</h1>
            <p className="text-black mt-1">{t('studentDashboardDescription')}</p>
          </div>
          <div className="flex items-center gap-3"><LanguageSwitcher /><Link href="/"><button className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold py-2 px-4 rounded-lg transition-colors">{t('backToHome')}</button></Link></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
            <div className="text-sm text-black font-semibold">{t('teamLead')}</div>
            <div className="text-2xl font-bold text-black mt-2">Coach Miller</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
            <div className="text-sm text-black font-semibold">{t('practiceSessions')}</div>
            <div className="text-3xl font-bold text-black mt-2">12</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm text-black font-semibold">{t('robotProgress')}</div>
            <div className="text-3xl font-bold text-black mt-2">78%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-cyan-500">
            <div className="text-sm text-black font-semibold">{t('competitions')}</div>
            <div className="text-3xl font-bold text-black mt-2">3</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <span className="text-xl">📅</span> {t('viewPracticeSchedule')}
          </button>
          <button className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <span className="text-xl">🤖</span> {t('robotDevelopment')}
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <span className="text-xl">💬</span> {t('contactCoach')}
          </button>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">{t('upcomingPracticeSessions')}</h2>
          <div className="space-y-4">
            {sessions.map((session, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex-1">
                  <p className="font-semibold text-black">{session.type}</p>
                  <p className="text-sm text-black">{t('atTime', { date: session.date, time: session.time })}</p>
                  <p className="text-xs text-black mt-1">{t('ledBy', { coach: session.coach })}</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  {t('join')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-black mb-4">{t('skillsProgress')}</h2>
          <div className="space-y-4">
            {skills.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <p className="font-semibold text-black">{item.skill}</p>
                <div className="w-48">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-right text-sm text-black mt-1">{item.progress}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
