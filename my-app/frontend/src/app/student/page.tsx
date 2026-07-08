'use client';

import Link from 'next/link';

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white border-b border-emerald-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">FTC Team Member Dashboard</h1>
            <p className="text-black mt-1">Track your robot development and join practice sessions</p>
          </div>
          <Link href="/">
            <button className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold py-2 px-4 rounded-lg transition-colors">
              Back to Home
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
            <div className="text-sm text-black font-semibold">Team Lead</div>
            <div className="text-2xl font-bold text-black mt-2">Coach Miller</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
            <div className="text-sm text-black font-semibold">Practice Sessions</div>
            <div className="text-3xl font-bold text-black mt-2">12</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm text-black font-semibold">Robot Progress</div>
            <div className="text-3xl font-bold text-black mt-2">78%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-cyan-500">
            <div className="text-sm text-black font-semibold">Competitions</div>
            <div className="text-3xl font-bold text-black mt-2">3</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <span className="text-xl">📅</span> View Practice Schedule
          </button>
          <button className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <span className="text-xl">🤖</span> Robot Development
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
            <span className="text-xl">💬</span> Contact Coach
          </button>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-black mb-4">Upcoming Practice Sessions</h2>
          <div className="space-y-4">
            {[
              { date: 'Tomorrow', time: '2:00 PM', type: 'Robot Programming', coach: 'Coach Miller' },
              { date: 'Thursday', time: '3:30 PM', type: 'Mechanical Design', coach: 'Coach Miller' },
              { date: 'Saturday', time: '10:00 AM', type: 'Competition Prep', coach: 'Coach Miller' },
            ].map((session, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex-1">
                  <p className="font-semibold text-black">{session.type}</p>
                  <p className="text-sm text-black">{session.date} at {session.time}</p>
                  <p className="text-xs text-black mt-1">Led by {session.coach}</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-black mb-4">Your Skills Progress</h2>
          <div className="space-y-4">
            {[
              { skill: 'Programming', progress: 85 },
              { skill: 'Mechanical Design', progress: 72 },
              { skill: 'Electronics', progress: 90 },
              { skill: 'CAD Design', progress: 65 },
            ].map((item, idx) => (
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
