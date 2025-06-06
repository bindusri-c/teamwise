import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { BrainCircuit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'signup') {
      setActiveTab('signup');
    }
  }, [location.search]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setErrorMessage("Login failed. Please check your credentials and try again.");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your name");
      setIsLoading(false);
      return;
    }

    try {
      const success = await signup(email, password);
      if (success) {
        setActiveTab('login');
        setPassword('');
        toast({
          title: "Account created",
          description: "Please check your email to verify your account, then log in.",
        });
      } else {
        setErrorMessage("Signup failed. Please try again with a different email.");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  const toast = (props: { title: string; description: string }) => {
    alert(`${props.title}: ${props.description}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="bg-white p-3 rounded-full shadow-lg">
            <BrainCircuit size={40} className="text-rag-primary" />
          </div>
        </div>
        
        <Card className="w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">MeetWise</CardTitle>
            <CardDescription className="text-center">
              Your AI-powered networking assistant
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2 mb-4 px-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            {errorMessage && (
              <div className="px-6 mb-4">
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              </div>
            )}
            
            <TabsContent value="login">
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input
                      id="email-login"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-login">Password</Label>
                      <a href="#" className="text-sm text-rag-primary hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="password-login"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-rag-primary hover:bg-rag-secondary transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="signup">
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-signup">Name</Label>
                    <Input
                      id="name-signup"
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-rag-primary hover:bg-rag-secondary transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
          
          <CardFooter className="flex flex-col space-y-4 pb-6">
            <div className="text-xs text-center text-gray-500 mt-4">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
