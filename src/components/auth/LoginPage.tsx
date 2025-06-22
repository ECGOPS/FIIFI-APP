import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await login(email, password);
      
      if (!success) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      let errorMessage = "An error occurred during login. Please try again.";
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email format.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950 dark:to-yellow-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/ecg-uploads/5cde61ae-2a1b-429f-abd3-69c473f7d353.png" 
              alt="ECG Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fiifi App</h1>
          <p className="text-gray-600 dark:text-gray-300">Meter Reading</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gec.gh"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-700 hover:to-yellow-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
