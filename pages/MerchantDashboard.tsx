import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { merchantFirstAidService } from '../services/gemini';
import { Message, Sender, Ticket } from '../types';
import ChatInterface from '../components/ChatInterface';

const MerchantDashboard: React.FC = () => {
  const { currentMessages, addMessage, addTicket, clearMessages } = useTickets();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendMessage = async (text: string) => {
    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: Sender.USER,
      timestamp: new Date()
    };
    addMessage(userMsg);
    setIsLoading(true);

    let toolOutput = '';

    // Call Gemini
    const responseText = await merchantFirstAidService.sendMessage(text, (tool, result) => {
      // Capture tool output to show in UI
      toolOutput = `> ${tool}\n${result}`;
    });

    // Add Bot Message
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: Sender.BOT,
      timestamp: new Date(),
      relatedToolOutput: toolOutput || undefined
    };
    addMessage(botMsg);
    setIsLoading(false);
  };

  const handleCreateTicket = async () => {
    setIsLoading(true);
    // Convert chat history for the AI summary
    const historyForAi = currentMessages.map(m => ({
      role: m.sender === Sender.USER ? 'user' : 'model',
      text: m.text
    }));

    // Generate Private Note using Gemini
    const summary = await merchantFirstAidService.generateTicketSummary(historyForAi);

    const newTicket: Ticket = {
      id: `TKT-${Math.floor(Math.random() * 10000)}`,
      merchantName: "Awesome Corp Ltd.",
      subject: currentMessages.length > 0 ? currentMessages[0].text.substring(0, 30) + "..." : "Support Request",
      status: 'Open',
      priority: 'Medium',
      aiDiagnosis: summary,
      chatHistory: [...currentMessages],
      createdAt: new Date()
    };

    addTicket(newTicket);
    clearMessages();
    setIsLoading(false);
    
    // In a real app, maybe show a success toast. 
    // Here we'll just switch views to show the result.
    navigate('/admin');
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-100">
      {/* Sidebar (Dummy Dashboard) */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">Razorpay</h1>
          <p className="text-xs">Merchant Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 bg-slate-800 text-white rounded cursor-pointer">Home</div>
          <div className="px-4 py-2 hover:bg-slate-800 rounded cursor-pointer">Transactions</div>
          <div className="px-4 py-2 hover:bg-slate-800 rounded cursor-pointer">Settlements</div>
          <div className="px-4 py-2 hover:bg-slate-800 rounded cursor-pointer">Developers</div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => navigate('/admin')}
            className="w-full text-xs text-center text-slate-500 hover:text-white"
          >
             Switch to Agent View (Freshdesk) &rarr;
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        <div className="p-6 h-full max-w-4xl mx-auto w-full flex flex-col">
          <div className="mb-4 flex justify-between items-center">
             <h2 className="text-2xl font-bold text-gray-800">Help & Support</h2>
             {currentMessages.length > 0 && (
               <button 
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow hover:bg-green-700 transition"
                disabled={isLoading}
               >
                 {isLoading ? 'Processing...' : 'Escalate to Agent'}
               </button>
             )}
          </div>
          
          <div className="flex-1 min-h-0">
             <ChatInterface 
              messages={currentMessages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
             />
          </div>
          
          <p className="text-center text-xs text-gray-400 mt-2">
            First-Aid Bot v1.0 • Powered by Gemini 2.5 • Connected to Moses
          </p>
        </div>
        
        {/* Mobile Nav Switcher */}
        <div className="md:hidden absolute top-2 right-2">
           <button onClick={() => navigate('/admin')} className="text-xs bg-slate-800 text-white px-2 py-1 rounded">Agent View</button>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;