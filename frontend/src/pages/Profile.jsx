import React from 'react'
import { useNavigate } from 'react-router-dom'
import useProfile from '@/hooks/useProfile'
import ProfileSummary from '@/components/Profile/ProfileSummary'
import ChangePasswordForm from '@/components/Profile/ChangePasswordForm'
import SubmissionsList from '@/components/Profile/SubmissionsList'
import ProfileHero from '@/components/Profile/ProfileHero'
import { Button } from '@/components/UI'

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
    return <div className="flex min-h-screen items-center justify-center text-gray-400 font-black">Đang tải hồ sơ...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fffefb] to-[#f8fbff] px-3 py-6 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6">
            <ProfileHero me={me} mySubmissions={mySubmissions} onEditProfile={() => setActiveTab('overview')} onAvatarUpdated={fetchMe} />
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="rounded-3xl bg-white/95 p-4 border border-orange-50 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-3">
                <button className={`px-4 py-2 rounded-2xl font-black ${activeTab === 'overview' ? 'bg-fpt-blue/5 text-fpt-blue' : 'text-gray-500'}`} onClick={() => setActiveTab('overview')}>Tổng quan</button>
                <button className={`px-4 py-2 rounded-2xl font-black ${activeTab === 'submissions' ? 'bg-fpt-blue/5 text-fpt-blue' : 'text-gray-500'}`} onClick={() => setActiveTab('submissions')}>Bài thi</button>
                <button className={`px-4 py-2 rounded-2xl font-black ${activeTab === 'security' ? 'bg-fpt-blue/5 text-fpt-blue' : 'text-gray-500'}`} onClick={() => setActiveTab('security')}>Bảo mật</button>
              </div>

              <div className="mt-6">
                {activeTab === 'overview' && (
                  <ProfileSummary me={me} name={name} setName={setName} onSave={saveProfile} onLogout={logout} error={error} message={message} />
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
    </div>
  )
}

export default Profile
