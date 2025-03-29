import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Mail, User, FileText, Calendar } from "lucide-react";
import { MessagesHeader } from "@/components/sections/header";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const messagesPerPage = 5;

  const totalPages = Math.ceil(messages.length / messagesPerPage);
  const startIndex = (currentPage - 1) * messagesPerPage;
  const endIndex = startIndex + messagesPerPage;
  const currentMessages = messages.slice(startIndex, endIndex);

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        "https://portfolio-backend-ashen-tau.vercel.app/contact"
      );
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleRowClick = (message: Message) => {
    setSelectedMessage(message);
    setIsDialogOpen(true);
  };

  return (
    <div className="container py-12">
      <MessagesHeader />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Contact Messages
          </h1>
          <Button variant="outline" asChild>
            <a href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>
              You have received {messages.length} messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center font-bold">Name</TableHead>
                  <TableHead className="text-center font-bold">
                    Subject
                  </TableHead>
                  <TableHead className="text-center font-bold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? [...Array(messagesPerPage)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  : currentMessages.map((message) => (
                      <TableRow
                        key={message._id}
                        className="cursor-pointer hover:bg-muted/50 text-muted-foreground"
                        onClick={() => handleRowClick(message)}
                      >
                        <TableCell className="font-medium">
                          {message.name}
                        </TableCell>
                        <TableCell>{message.subject}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>

            {messages.length > messagesPerPage && (
              <div className="flex justify-between items-center pt-4">
                {currentPage > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                  >
                    Previous
                  </Button>
                ) : (
                  <div />
                )}

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog for message details */}
      {selectedMessage && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedMessage.subject}</DialogTitle>
              <DialogDescription>Message details</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">From</p>
                  <p>{selectedMessage.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p>{selectedMessage.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p>
                    {new Date(selectedMessage.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Message</p>
                  <p className="mt-2 text-muted-foreground whitespace-pre-line">
                    {selectedMessage.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
              <a href={`mailto:${selectedMessage.email}`}>
                <Button>Reply</Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
