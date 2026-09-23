import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/authorization';
import { acceptInviteForLoggedInUser } from '@/lib/actions/auth';
import { InviteRegistrationForm } from './_components/InviteRegistrationForm';
import Link from 'next/link';
import { Building2, ShieldCheck, UserCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const token = params.token;

  const [user, invitation] = await Promise.all([
    getCurrentUser(),
    prisma.organizationInvitation.findUnique({
      where: { token },
      include: { organization: true },
    }),
  ]);

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex flex-col items-center justify-center p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-2xl border border-rose-200 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid or Expired Invitation</h1>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            This invitation link is invalid, expired, or has already been accepted. Contact your workspace administrator for a new invite.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors w-full"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // If not logged in, check if user already exists
  const existingUser = !user
    ? await prisma.user.findUnique({
        where: { email: invitation.email },
      })
    : null;

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Building2 className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Workspace Invitation</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Join {invitation.organization.name}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          You have been invited to collaborate as an{' '}
          <span className="font-bold text-slate-800 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
            {invitation.role}
          </span>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel py-8 px-6 sm:px-8 rounded-2xl border border-slate-200/80 shadow-sm">
          {user ? (
            /* User already authenticated */
            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-left">
                <div className="text-slate-400 uppercase font-bold text-[10px] mb-1">
                  Currently Logged In As
                </div>
                <div className="font-bold text-slate-900">{user.name || user.email}</div>
                <div className="text-slate-500 text-[11px]">{user.email}</div>
              </div>

              <form action={acceptInviteForLoggedInUser.bind(null, token)}>
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Accept Invitation &amp; Enter Workspace</span>
                </Button>
              </form>

              <p className="text-[11px] text-slate-400">
                Not your account?{' '}
                <Link
                  href={`/login?callbackUrl=/invite/${token}`}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Sign in with another account
                </Link>
              </p>
            </div>
          ) : existingUser ? (
            /* Existing user with this email */
            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-left">
                <div className="font-bold text-slate-900 mb-1">Account Already Registered</div>
                <p className="text-slate-600 leading-relaxed">
                  An EstateScale account for <strong className="text-slate-900">{invitation.email}</strong> is already registered. Please sign in to link your account to {invitation.organization.name}.
                </p>
              </div>

              <Link
                href={`/login?callbackUrl=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <span>Sign In to Accept</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            /* New user registration form */
            <InviteRegistrationForm
              token={token}
              email={invitation.email}
              orgName={invitation.organization.name}
              role={invitation.role}
            />
          )}
        </div>
      </div>
    </div>
  );
}
