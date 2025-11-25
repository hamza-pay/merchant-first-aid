import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Ticket, Message } from '../types';

interface TicketContextType {
  tickets: Ticket[];
  addTicket: (ticket: Ticket) => void;
  currentMessages: Message[];
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

  const addTicket = (ticket: Ticket) => {
    setTickets(prev => [ticket, ...prev]);
  };

  const addMessage = (msg: Message) => {
    setCurrentMessages(prev => [...prev, msg]);
  };

  const clearMessages = () => {
    setCurrentMessages([]);
  };

  return (
    <TicketContext.Provider value={{ tickets, addTicket, currentMessages, addMessage, clearMessages }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) throw new Error("useTickets must be used within TicketProvider");
  return context;
};