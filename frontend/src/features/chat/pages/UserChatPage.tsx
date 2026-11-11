import { useNavigate, useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

export default function UserChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  if (!sessionId) return null;

  return (
    <section className="mx-auto h-[calc(100vh-4rem)] w-full max-w-3xl px-0 sm:px-4 sm:py-6">
      <div className="h-full overflow-hidden rounded-none border-0 border-[#592209]/15 bg-[#FBF5EC] shadow-none sm:rounded-2xl sm:border sm:shadow-[0_6px_24px_rgba(89,34,9,0.08)]">
        <ChatWindow sessionId={sessionId} role="USER" onBack={() => navigate("/dashboard/chats")} />
      </div>
    </section>
  );
}
