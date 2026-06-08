"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Building2,
  Circle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Negotiation } from "@/lib/mock-data";

interface NegotiationsTabProps {
  negotiations: Negotiation[];
  onToggleAutoReply: (id: string) => void;
  onSendMessage: (negotiationId: string, text: string) => void;
}

export function NegotiationsTab({
  negotiations,
  onToggleAutoReply,
  onSendMessage,
}: NegotiationsTabProps) {
  const [selectedId, setSelectedId] = useState<string>(negotiations[0]?.id || "");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = negotiations.find((n) => n.id === selectedId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedId) return;
    onSendMessage(selectedId, messageText.trim());
    setMessageText("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-500";
      case "waiting":
        return "text-amber-500";
      case "closed":
        return "text-neutral-400";
      default:
        return "text-neutral-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Активно";
      case "waiting":
        return "Ожидание";
      case "closed":
        return "Закрыто";
      default:
        return status;
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)] min-h-[400px]">
      {/* Left panel - Negotiations list */}
      <Card className="border-0 shadow-sm w-full lg:w-80 shrink-0 flex flex-col">
        <CardContent className="p-3 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3 px-1">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold">Переговоры</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {negotiations.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1 -mx-1">
            <div className="space-y-1 px-1">
              {negotiations.map((neg) => (
                <button
                  key={neg.id}
                  onClick={() => setSelectedId(neg.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    selectedId === neg.id
                      ? "bg-emerald-50 border border-emerald-200"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Circle
                          className={`w-2 h-2 fill-current ${getStatusColor(neg.status)}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getStatusLabel(neg.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate mt-0.5">
                        {neg.vacancyTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {neg.company}
                      </p>
                    </div>
                    {neg.unread > 0 && (
                      <Badge className="bg-emerald-500 text-white text-xs px-1.5 py-0 border-0 shrink-0">
                        {neg.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                    {neg.lastMessage}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right panel - Message thread */}
      <Card className="border-0 shadow-sm flex-1 flex flex-col hidden lg:flex">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold">
                    {selected.vacancyTitle}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.company} &middot; {selected.employerName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Авто-ответ
                  </span>
                  <Switch
                    checked={selected.autoReply}
                    onCheckedChange={() => onToggleAutoReply(selected.id)}
                  />
                </div>
                <Badge
                  className={`text-xs ${
                    selected.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : selected.status === "waiting"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {getStatusLabel(selected.status)}
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selected.messages.map((msg) => {
                  const isMe = msg.sender === "me" || msg.sender === "bot";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                          isMe
                            ? msg.isAutoReply
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-neutral-100 text-neutral-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {isMe ? (
                          msg.isAutoReply ? (
                            <Bot className="w-3.5 h-3.5" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <Building2 className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div
                        className={`max-w-[70%] ${
                          isMe ? "text-right" : "text-left"
                        }`}
                      >
                        <div
                          className={`inline-block rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? "bg-emerald-600 text-white"
                              : "bg-muted"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 mt-1 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.isAutoReply && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0 font-normal"
                            >
                              <Bot className="w-2.5 h-2.5 mr-0.5" />
                              Авто
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            {selected.status !== "closed" && (
              <div className="p-3 border-t">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Введите сообщение..."
                    className="flex-1 h-9 text-sm"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Выберите переговоры</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
