import { StreamingTextResponse, LangChainStream } from "ai";
import { auth, currentUser } from "@clerk/nextjs";
import { CallbackManager } from "langchain/callbacks";
import { Replicate } from "langchain/llms/replicate";
import { NextResponse } from "next/server";

import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { prompt } = await request.json();
    const user = await currentUser();

    if (!user || !user.firstName || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identifier = request.url + "-" + user.id;
    const { success } = await rateLimit(identifier);

    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const companion = await prismadb.companion.update({
      where: {
        id: params.chatId,
        userId: user.id,
      },
      data: {
        messages: {
          create: {
            content: prompt,
            role: "user",
            userId: user.id,
          },
        },
      },
    });

    if(!companion) {
        return new NextResponse("Companion not fund", {status: 404})
    };

    const name = companion.id;
    const companion_file_name = name + ".txt";

    const companionKey = {
        companionName: name,
        userId: user.id,
        modelName: "llama2-13b",
    };

    const memoryManager = await MemoryManager.getInstance();

    const records = await memoryManager.readLatestHistory(companionKey);

    if(records.length === 0) {
        await memoryManager.seedChatHistory(companion.seed, "\n\n",companionKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey)

    const recentChatHistory = await memoryManager.readLatestHistory(companionKey);

    const similarDocs = await memoryManager.vectorSearch(
      recentChatHistory,
      companion_file_name,
    );

    let relevantHistory = "";

      if(!!similarDocs && similarDocs.length !== 0) {
        relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
      };

      const {handlers} = LangChainStream();

      // const model = new Replicate({
      //   model: 
      // })

  } catch (error) {
    console.log("[CHAT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
