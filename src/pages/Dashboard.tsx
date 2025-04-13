
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 container py-8 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-6">Welcome, {user?.name || 'User'}</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Start exploring the power of RAG technology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is your RAGVerse dashboard. More features will be added as we build them.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>
                Your recently analyzed documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>No documents yet. Stay tuned for document management features!</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>
                Ask questions about your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Chat features coming soon!</p>
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
