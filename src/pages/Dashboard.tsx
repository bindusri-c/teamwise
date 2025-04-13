
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateEventForm from '@/components/CreateEventForm';
import JoinEventForm from '@/components/JoinEventForm';
import EventsList from '@/components/EventsList';
import EmbeddingTestButton from '@/components/EmbeddingTestButton';
import { CalendarPlus, UserPlus, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  
  // Extract display name from email or use a fallback
  const displayName = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 container py-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Welcome, {displayName}</h1>
          <div className="flex gap-2">
            <EmbeddingTestButton />
            <Link to="/profile">
              <Button variant="outline" className="flex items-center gap-2">
                <User size={16} />
                Manage Profile
                <ExternalLink size={14} />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Your Network Hub</CardTitle>
              <CardDescription>
                Create or join events to start connecting with the right people
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="events" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="events">Your Events</TabsTrigger>
                  <TabsTrigger value="actions">Create or Join</TabsTrigger>
                </TabsList>
                
                <TabsContent value="events" className="pt-4">
                  <EventsList />
                </TabsContent>
                
                <TabsContent value="actions" className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center gap-4">
                        <CalendarPlus className="h-8 w-8 text-rag-primary" />
                        <div>
                          <CardTitle>Create Event</CardTitle>
                          <CardDescription>Host your own networking event</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CreateEventForm />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="flex flex-row items-center gap-4">
                        <UserPlus className="h-8 w-8 text-rag-primary" />
                        <div>
                          <CardTitle>Join Event</CardTitle>
                          <CardDescription>Enter a 6-digit code to join</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <JoinEventForm />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
              <CardDescription>
                Make the most of your networking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>Update your profile to improve matches</li>
                <li>Share your event code with others to grow your network</li>
                <li>Check in regularly to see new connection suggestions</li>
                <li>Look for events in your industry or area of interest</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <footer className="border-t py-4 px-6 text-center text-sm text-gray-500">
        RAGVerse © {new Date().getFullYear()} - AI-Powered Knowledge Assistant
      </footer>
    </div>
  );
};

export default Dashboard;
