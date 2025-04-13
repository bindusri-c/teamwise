
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rag-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-rag-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="font-bold text-xl">RAGVerse</span>
          </div>
          <div className="space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-gray-700 hover:text-rag-primary"
            >
              Log in
            </Button>
            <Button 
              onClick={() => navigate('/login?tab=signup')}
              className="bg-rag-primary hover:bg-rag-secondary"
            >
              Sign up free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
            Discover Meaningful Connections with Our AI-Powered Networking Assistant
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Don't miss out on your next great conversation—create an account to unlock personalized matches.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/login?tab=signup')}
              className="bg-rag-primary hover:bg-rag-secondary text-lg py-6 px-8"
              size="lg"
            >
              Sign Up Free
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')}
              className="text-lg py-6 px-8"
              size="lg"
            >
              Log In
            </Button>
          </div>
        </div>
      </section>

      {/* Product Overview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Tired of Random Business Cards and Shallow Introductions?
          </h2>
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-16">
            Our advanced semantic matching helps you find the right people based on your skills, interests, and goals—helping you foster real relationships at events.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="font-bold text-xl mb-4">Event-Based</h3>
              <p className="text-gray-600">Quickly join or host events with ease.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="font-bold text-xl mb-4">Smart Matchmaking</h3>
              <p className="text-gray-600">Leverage AI to connect with professionals who share your interests.</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <h3 className="font-bold text-xl mb-4">Analytics-Driven</h3>
              <p className="text-gray-600">Gain insights into your networking ROI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-16">
            Just three simple steps to transform your networking experience
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-lg shadow-sm relative">
              <div className="w-12 h-12 bg-rag-primary rounded-full flex items-center justify-center text-white font-bold absolute -top-6 left-1/2 transform -translate-x-1/2">1</div>
              <h3 className="font-bold text-xl mb-4 mt-4 text-center">Create Your Profile</h3>
              <p className="text-gray-600 text-center">Tell us about your skills, interests, and professional background.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm relative">
              <div className="w-12 h-12 bg-rag-primary rounded-full flex items-center justify-center text-white font-bold absolute -top-6 left-1/2 transform -translate-x-1/2">2</div>
              <h3 className="font-bold text-xl mb-4 mt-4 text-center">Join Events & Generate QR Codes</h3>
              <p className="text-gray-600 text-center">Seamlessly sign up for conferences, meetups, or private gatherings with a simple QR scan.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm relative">
              <div className="w-12 h-12 bg-rag-primary rounded-full flex items-center justify-center text-white font-bold absolute -top-6 left-1/2 transform -translate-x-1/2">3</div>
              <h3 className="font-bold text-xl mb-4 mt-4 text-center">Get Curated Connections</h3>
              <p className="text-gray-600 text-center">Our AI suggests people with complementary expertise or shared goals—start chatting or schedule a meetup!</p>
            </div>
          </div>
          
          <div className="text-center">
            <Button variant="outline" className="inline-flex items-center">
              See How We Match <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Key Benefits</h2>
          
          <div className="grid md:grid-cols-2 gap-10">
            <div className="flex">
              <div className="mr-4 text-rag-primary">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Personalized Recommendations</h3>
                <p className="text-gray-600">AI-driven technology analyzes your profile and matches you with the most relevant professionals.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="mr-4 text-rag-primary">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Easy Onboarding & QR Codes</h3>
                <p className="text-gray-600">No more clunky registration forms. Just scan to join events, and you're good to go.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="mr-4 text-rag-primary">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Actionable Insights</h3>
                <p className="text-gray-600">Organizers get real-time data on attendee engagement. You get feedback to optimize networking outcomes.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="mr-4 text-rag-primary">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Secure & Private</h3>
                <p className="text-gray-600">Built-in authentication and encryption to protect your data.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What People Are Saying</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <p className="text-gray-600 mb-6 italic">
                "This platform helped me connect with three top-level developers in just one day. I made more meaningful connections here than at any networking mixer!"
              </p>
              <div className="font-bold">— Alex, Product Manager @ InnovateTech</div>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <p className="text-gray-600 mb-6 italic">
                "The AI-based matchmaking saved us so much time at our annual conference. Attendees found the exact people they wanted to meet!"
              </p>
              <div className="font-bold">— Sarah, Event Organizer</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-rag-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Level-Up Your Networking?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Sign up in seconds and explore a new way to connect at events.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/login?tab=signup')} 
              className="bg-white text-rag-primary hover:bg-gray-100 text-lg py-6 px-8"
              size="lg"
            >
              Get Started for Free
            </Button>
            <div>
              <Button 
                variant="link" 
                onClick={() => navigate('/login')}
                className="text-white underline"
              >
                Already have an account? Log In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold mb-4">About</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Our Story</a></li>
                <li><a href="#" className="hover:text-white">Team</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Networking Tips</a></li>
                <li><a href="#" className="hover:text-white">Success Stories</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQs</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p>&copy; {new Date().getFullYear()} RAGVerse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
