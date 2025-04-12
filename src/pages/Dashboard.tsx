import React, { useState, useEffect } from 'react';
import { MessageSquare, Calendar, FileText, Users, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Discussion, Quote } from '../types';

interface DashboardStats {
  activeDiscussions: number;
  appointmentsToday: number;
  pendingQuotes: number;
  newClients: number;
  responseRate: number;
  averageResponseTime: number;
  customerSatisfaction: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'appointment' | 'quote';
  user: string;
  time: string;
  content: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeDiscussions: 0,
    appointmentsToday: 0,
    pendingQuotes: 0,
    newClients: 0,
    responseRate: 0,
    averageResponseTime: 0,
    customerSatisfaction: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time updates
    const discussionsSubscription = supabase
      .channel('dashboard_discussions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussions' }, () => {
        loadDashboardData();
      })
      .subscribe();

    const appointmentsSubscription = supabase
      .channel('dashboard_appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadDashboardData();
      })
      .subscribe();

    const quotesSubscription = supabase
      .channel('dashboard_quotes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      discussionsSubscription.unsubscribe();
      appointmentsSubscription.unsubscribe();
      quotesSubscription.unsubscribe();
    };
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Get active discussions (conversations with unread messages)
      const { data: discussions } = await supabase
        .from('discussions')
        .select('*')
        .eq('read', false)
        .eq('type', 'human');

      // Get today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          available_date:date_id (
            datetime
          )
        `)
        .eq('status', 'confirmed');

      // Filter appointments for today based on the available_date
      const todayAppointments = appointments?.filter(appointment => {
        const appointmentDate = new Date(appointment.available_date.datetime);
        return appointmentDate >= today && appointmentDate < tomorrow;
      });

      // Get pending quotes
      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('status', 'pending');

      // Get new clients (clients from the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: newClients } = await supabase
        .from('appointments')
        .select('name')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Calculate response rate (ratio of answered vs total messages)
      const { data: totalMessages } = await supabase
        .from('discussions')
        .select('*')
        .eq('type', 'human');

      const { data: answeredMessages } = await supabase
        .from('discussions')
        .select('*')
        .eq('type', 'human')
        .eq('read', true);

      const responseRate = totalMessages?.length ? 
        (answeredMessages?.length || 0) / totalMessages.length * 100 : 0;

      // Get recent activities
      const recentActivities: RecentActivity[] = [];

      // Recent messages
      const { data: recentMessages } = await supabase
        .from('discussions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      recentMessages?.forEach(message => {
        recentActivities.push({
          id: message.id.toString(),
          type: 'message',
          user: message.client_name,
          time: formatTime(message.created_at),
          content: message.type === 'human' ? 'A envoyé un nouveau message' : 'Message répondu'
        });
      });

      // Recent appointments
      const { data: recentAppointments } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      recentAppointments?.forEach(appointment => {
        recentActivities.push({
          id: appointment.id,
          type: 'appointment',
          user: appointment.name,
          time: formatTime(appointment.created_at),
          content: `Rendez-vous ${appointment.status === 'confirmed' ? 'confirmé' : 'créé'}`
        });
      });

      // Recent quotes
      const { data: recentQuotes } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      recentQuotes?.forEach(quote => {
        recentActivities.push({
          id: quote.id,
          type: 'quote',
          user: quote.customer_name,
          time: formatTime(quote.created_at),
          content: `Devis ${quote.status === 'accepted' ? 'accepté' : quote.status === 'rejected' ? 'refusé' : 'en attente'}`
        });
      });

      // Sort activities by time
      recentActivities.sort((a, b) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      setStats({
        activeDiscussions: discussions?.length || 0,
        appointmentsToday: todayAppointments?.length || 0,
        pendingQuotes: quotes?.length || 0,
        newClients: new Set(newClients?.map(client => client.name)).size || 0,
        responseRate,
        averageResponseTime: 8,
        customerSatisfaction: 4.8
      });

      setRecentActivities(recentActivities.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString();
    }
  }

  const statCards = [
    {
      id: 1,
      name: 'Conversations actives',
      value: stats.activeDiscussions.toString(),
      icon: <MessageSquare className="h-6 w-6 text-blue-500" />,
      change: '+8%',
      changeType: 'increase'
    },
    {
      id: 2,
      name: 'Rendez-vous aujourd\'hui',
      value: stats.appointmentsToday.toString(),
      icon: <Calendar className="h-6 w-6 text-green-500" />,
      change: `+${stats.appointmentsToday}`,
      changeType: 'increase'
    },
    {
      id: 3,
      name: 'Devis en attente',
      value: stats.pendingQuotes.toString(),
      icon: <FileText className="h-6 w-6 text-yellow-500" />,
      change: stats.pendingQuotes > 0 ? `+${stats.pendingQuotes}` : '0',
      changeType: stats.pendingQuotes > 0 ? 'increase' : 'neutral'
    },
    {
      id: 4,
      name: 'Nouveaux clients',
      value: stats.newClients.toString(),
      icon: <Users className="h-6 w-6 text-purple-500" />,
      change: '+12%',
      changeType: 'increase'
    }
  ];

  return (
    <div className="flex-1 bg-[#f0f2f5] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array(4).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : (
            statCards.map((stat) => (
              <div key={stat.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-full bg-gray-100">{stat.icon}</div>
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 
                    stat.changeType === 'decrease' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium truncate">{stat.name}</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-semibold text-gray-900">{stat.value}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Activités récentes</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, index) => (
                    <div key={index} className="flex items-center animate-pulse">
                      <div className="h-8 w-8 bg-gray-200 rounded-full mr-4"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentActivities.map((activity) => (
                    <li key={activity.id} className="py-4 flex">
                      <div className="mr-4">
                        {activity.type === 'message' && <MessageSquare className="h-6 w-6 text-blue-500" />}
                        {activity.type === 'appointment' && <Calendar className="h-6 w-6 text-green-500" />}
                        {activity.type === 'quote' && <FileText className="h-6 w-6 text-yellow-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.user}</p>
                        <p className="text-sm text-gray-500">{activity.content}</p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {activity.time}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {/* Performance Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Performance</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-6 animate-pulse">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Taux de réponse</h4>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-semibold text-gray-900">
                          {stats.responseRate.toFixed(1)}%
                        </span>
                        <span className="ml-2 text-sm text-green-600">+2.5%</span>
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500">Temps de réponse moyen</h4>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-semibold text-gray-900">
                        {stats.averageResponseTime} min
                      </span>
                      <span className="ml-2 text-sm text-green-600">-1.2 min</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500">Satisfaction client</h4>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-semibold text-gray-900">
                        {stats.customerSatisfaction}/5
                      </span>
                      <span className="ml-2 text-sm text-green-600">+0.3</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}