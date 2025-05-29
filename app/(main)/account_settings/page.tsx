"use client";
import { useSession } from "@/providers/SessionProvider";
import ProfileImage from "@/components/ProfileImage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import UserName from "@/components/UserName";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import UserEmail from "@/components/UserEmail";
import { Badge } from "@/components/ui/badge";
import { CheckCheckIcon } from "lucide-react";

export default function AccountSettings() {
  const { user, refreshSession } = useSession();

  if (user)
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>User Data</CardTitle>
            <CardDescription>You can update users data here.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileImage user={user} />
            <Table>
              <TableBody>
                <TableRow>
                  {/* name */}
                  <TableCell>
                    <strong className="text-muted-foreground">Full Name</strong>
                  </TableCell>
                  <TableCell>
                    <UserName user={user} />
                  </TableCell>
                </TableRow>
                {/* phone */}
                <TableRow>
                  <TableCell>
                    <strong className="text-muted-foreground">
                      Phone Number
                    </strong>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row items-center justify-between">
                      {user?.phone ? `+${user.phone}` : "N/A"}
                      <Badge className="bg-green-600 ml-2">
                        <CheckCheckIcon />
                        Verified
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
                {/* email */}
                <TableRow>
                  <TableCell>
                    <strong className="text-muted-foreground">
                      Email Address
                    </strong>
                  </TableCell>
                  <TableCell>
                    <UserEmail user={user} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* <UserDataForm user={user} refreshSession={refreshSession} /> */}
      </div>
    );
}
