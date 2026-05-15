import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useProfile from '@/hooks/useProfile'
import ProfileSummary from '@/components/Profile/ProfileSummary'
import ChangePasswordForm from '@/components/Profile/ChangePasswordForm'
import SubmissionsList from '@/components/Profile/SubmissionsList'
import ProfileHero from '@/components/Profile/ProfileHero'
import { User, FileText, Shield, ArrowLeft, Home } from 'lucide-react'

const tabs = [
  { key: 'overview', label: 'Tổng quan', icon: User },
  { key: 'submissions', label: 'Bài thi', icon: FileText },
  { key: 'security', label: 'Bảo mật', icon: Shield },
]

export const Profile = () => {
  const {
    me,
    name,
    setName,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    message,
    error,
    mySubmissions,
    loading,
    fetchMe,
    saveProfile,
    changePassword,
    logout,
  } = useProfile()

  const [activeTab, setActiveTab] = React.useState('overview')
  const navigate = useNavigate()

  if (loading || !me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 border-t-fpt-orange" />
        </div>
        <p className="text-sm font-bold text-gray-400 animate-pulse">Đang tải hồ sơ...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.4) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }} />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Back navigation */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <ArrowLeft size={16} />
            <Home size={14} />
            <span>Trang chủ</span>
          </Link>
          <span className="text-xs font-bold text-gray-300">/</span>
          <span className="text-xs font-black uppercase tracking-widest text-fpt-orange">Hồ sơ cá nhân</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
          {/* Left sidebar — Profile card */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <ProfileHero
              me={me}
              mySubmissions={mySubmissions}
              onEditProfile={() => setActiveTab('overview')}
              onAvatarUpdated={fetchMe}
            />
          </div>

          {/* Right content area */}
          <div className="space-y-6">
            {/* Tab navigation */}
            <div className="flex gap-1 rounded-2xl bg-white p-1.5 shadow-sm shadow-gray-100/60 border border-gray-100">
              {tabs.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`relative flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-fpt-orange to-orange-400 text-white shadow-md shadow-orange-200/40'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="rounded-3xl bg-white p-5 shadow-sm shadow-gray-100/60 border border-gray-100 sm:p-7">
              {activeTab === 'overview' && (
                <ProfileSummary
                  me={me}
                  name={name}
                  setName={setName}
                  onSave={saveProfile}
                  onLogout={logout}
                  error={error}
                  message={message}
                />
              )}

              {activeTab === 'submissions' && (
                <SubmissionsList mySubmissions={mySubmissions} />
              )}

              {activeTab === 'security' && (
                <ChangePasswordForm
                  currentPassword={currentPassword}
                  newPassword={newPassword}
                  setCurrentPassword={setCurrentPassword}
                  setNewPassword={setNewPassword}
                  onChangePassword={changePassword}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
