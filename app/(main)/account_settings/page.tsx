"use client";
import React from "react";
import ProfileImage from "./_profileImage";
import { useSession } from "@/providers/SessionProvider";
import UserDataForm from "./_userDataForm";

export default function AccountSettings() {
  const { session, refreshSession } = useSession();

  if (session)
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4 space-y-4">
        <ProfileImage user={session.user} refreshSession={refreshSession} />
        <UserDataForm user={session.user} refreshSession={refreshSession} />
      </div>
    );
}
