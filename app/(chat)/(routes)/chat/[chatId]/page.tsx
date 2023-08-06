import prismadb from "@/lib/prismadb";
import { auth, redirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ChatClient } from "./components/client";

interface ChatIdPageProps {
  params: {
    chatId: string;
  };
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  const { userId } = auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: params.chatId,
    },
    // include messages
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        // we gonna only load message who have userId
        where: {
          userId,
        },
      },
      //   this is count all message from all the users
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

//   check if the user is the owner of the chat
  if (!companion) {
    return redirect("/");
  }


  return (
    <ChatClient companion={companion}/>
  )
};

export default ChatIdPage;
