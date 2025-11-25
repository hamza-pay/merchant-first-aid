import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Ticket } from '../types';

const AdminDashboard: React.FC = () => {
  const { tickets } = useTickets();
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#12344d] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#009b72] rounded flex items-center justify-center font-bold">fd</div>
            <h1 className="text-lg font-semibold">Freshdesk <span className="text-gray-400 font-normal text-sm">| L1 Support Queue</span></h1>
        </div>
        <button 
            onClick={() => navigate('/')}
            className="text-xs bg-[#009b72] hover:bg-[#007a5a] px-3 py-1.5 rounded transition"
        >
            &larr; Back to Merchant View
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Tickets ({tickets.length})</h2>
            <div className="flex space-x-2">
                <span className="px-3 py-1 bg-white border rounded text-sm text-gray-600">Sort by: Date Created</span>
                <span className="px-3 py-1 bg-white border rounded text-sm text-gray-600">Filter: All</span>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No tickets in the queue.</p>
                <p className="text-sm text-gray-400 mt-2">Go to Merchant View and escalate a conversation.</p>
            </div>
          ) : (
            <div className="grid gap-6">
                {tickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
            {/* Left: Ticket Info */}
            <div className="p-6 flex-1">
                <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${ticket.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {ticket.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">#{ticket.id}</span>
                    <span className="text-xs text-gray-500">• {ticket.createdAt.toLocaleString()}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{ticket.subject}</h3>
                <p className="text-sm text-gray-600 mb-4">from <strong>{ticket.merchantName}</strong></p>
                
                <div className="mt-4 border-t pt-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Chat Transcript Preview</h4>
                    <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 max-h-32 overflow-y-auto space-y-1">
                        {ticket.chatHistory.map(msg => (
                            <div key={msg.id}>
                                <span className="font-semibold">{msg.sender === 'user' ? 'Merchant' : 'Bot'}:</span> {msg.text.substring(0, 100)}{msg.text.length > 100 ? '...' : ''}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: AI Note (The "Private Note") */}
            <div className="md:w-96 bg-yellow-50 p-6 border-l border-yellow-100 flex flex-col relative">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                    AI PRIVATE NOTE
                </div>
                <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className="font-semibold text-yellow-800 text-sm">Merchant First-Aid Diagnosis</span>
                </div>
                
                <div className="prose prose-sm text-sm text-gray-800 whitespace-pre-wrap font-medium">
                    {ticket.aiDiagnosis}
                </div>

                <div className="mt-auto pt-4 flex space-x-2">
                    <button className="flex-1 bg-white border border-gray-300 text-gray-700 text-xs py-2 rounded hover:bg-gray-50">
                        Reply to Merchant
                    </button>
                    <button className="flex-1 bg-[#12344d] text-white text-xs py-2 rounded hover:bg-slate-800">
                        View Logs in Moses
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;