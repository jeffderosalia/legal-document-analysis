import { 
  deleteChatLog,
  createChatLog,
  ChatLog
} from "@legal-document-analysis/sdk";
import { isOk, Osdk, PageResult, Result,PropertyKeys   } from "@osdk/client";
import client from "./client";


const addToChat = async(chatLogEntries: createChatLog.Params[]) => {
  console.log('addToChat')
  console.log(chatLogEntries)
  await client(createChatLog).batchApplyAction(chatLogEntries,
    {
        $returnEdits: false,
    }
  );  
};

const getChatLog = async (userId: string) : Promise<any>  =>  {
  const page: Result<PageResult<Osdk.Instance<ChatLog>>> = await client(ChatLog)
    .where({
        who: {$eq: userId }
    })
    .fetchPageWithErrors({
        $pageSize: 200
    });

  if (isOk(page)) {
    const lookup: Record<string, Osdk.Instance<ChatLog, never, PropertyKeys<ChatLog>>[]> = page.value.data.reduce((acc, item) => {
      const threadId = item.threadId as string;
      if (!acc[threadId]) {
        acc[threadId] = [];
      }
      acc[threadId].push(item);
      return acc;
    }, {} as { [key: string]: Osdk.Instance<ChatLog, never, PropertyKeys<ChatLog>>[] });
    Object.values(lookup).forEach(thread => {
      thread.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    return Object.values(lookup).sort((a, b) => 
      new Date(a[0].when || '').getTime() - new Date(b[0].when || '').getTime()
    );
  }
};

const deleteChat = async (files: Osdk.Instance<ChatLog>[]) => {
  const actions = files.map(m=> ({
    "ChatLog": { 
      $primaryKey: m.chatLogId,    
      $apiName: m.$apiName,
      $objectType: m.$objectType,
      $title: m.$title
    }
  }));
  await client(deleteChatLog).batchApplyAction(actions,
    {
        $returnEdits: false,
    }
  );
};

export {addToChat, getChatLog, deleteChat};
