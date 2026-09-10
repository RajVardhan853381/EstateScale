import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/authorization";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const token = params.token;

  const user = await getCurrentUser();

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: { organization: true }
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
           <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-lg sm:px-10 text-center">
             <h1 className="text-xl font-bold text-red-600 mb-2">Invalid or Expired Invitation</h1>
             <p className="text-sm text-gray-500 mb-6">This invitation link has expired or is no longer valid.</p>
             <Link href="/" className="inline-block px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
               Return Home
             </Link>
           </div>
        </div>
      </div>
    );
  }

  async function acceptAction() {
    "use server";

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/api/auth/signin?callbackUrl=/invite/" + token);

    const inv = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!inv || inv.status !== "PENDING") {
       throw new Error("Invalid invitation");
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMembership.create({
        data: {
          userId: currentUser.id!,
          organizationId: inv.organizationId,
          role: inv.role
        }
      });

      await tx.organizationInvitation.update({
        where: { id: inv.id },
        data: { status: "ACCEPTED" }
      });
    });

    redirect(`/org/${inv.organization.slug}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join {invitation.organization.name}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You have been invited to join this organization as a {invitation.role}.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {user ? (
            <form action={acceptAction}>
               <p className="mb-4">Logged in as <strong>{user.email}</strong></p>
               <button
                 type="submit"
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
               >
                 Accept Invitation
               </button>
            </form>
          ) : (
            <div>
               <p className="mb-4 text-gray-600">Please sign in to accept this invitation.</p>
               <Link
                 href={`/api/auth/signin?callbackUrl=/invite/${token}`}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
               >
                 Sign In
               </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
