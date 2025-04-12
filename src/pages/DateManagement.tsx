import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, X, Pencil, Trash2, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

interface AvailableDate {
  id: string;
  datetime: string;
  status: 'available' | 'booked';
  client_name: string | null;
  client_phone: string | null;
}

export default function DateManagement() {
  const [dates, setDates] = useState<AvailableDate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingDate, setEditingDate] = useState<AvailableDate | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked'>('all');

  useEffect(() => {
    loadDates();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('available_dates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'available_dates'
        },
        () => {
          loadDates();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [statusFilter]); // Add statusFilter as dependency to reload when it changes

  const now = new Date();
  const minDateTime = now.toISOString().slice(0, 16);

  // Separate dates into future and past
  const { futureDates, pastDates } = dates.reduce<{
    futureDates: AvailableDate[];
    pastDates: AvailableDate[];
  }>(
    (acc, date) => {
      const dateTime = new Date(date.datetime);
      if (dateTime >= now) {
        acc.futureDates.push(date);
      } else {
        acc.pastDates.push(date);
      }
      return acc;
    },
    { futureDates: [], pastDates: [] }
  );

  // Sort future dates ascending and past dates descending
  const sortedFutureDates = futureDates.sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  
  const sortedPastDates = pastDates.sort((a, b) => 
    new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );

  async function deleteExpiredDates(dates: AvailableDate[]) {
    const now = new Date();
    const expiredDates = dates.filter(date => {
      const dateTime = new Date(date.datetime);
      return dateTime < now && date.status === 'available';
    });

    if (expiredDates.length > 0) {
      const expiredIds = expiredDates.map(date => date.id);
      const { error } = await supabase
        .from('available_dates')
        .delete()
        .in('id', expiredIds);

      if (error) {
        console.error('Error deleting expired dates:', error);
      } else {
        console.log(`Deleted ${expiredDates.length} expired dates`);
      }
    }
  }

  async function loadDates() {
    try {
      let query = supabase
        .from('available_dates')
        .select('*')
        .order('datetime', { ascending: true });

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        await deleteExpiredDates(data);
        
        // Reload with filter after deleting expired dates
        let reloadQuery = supabase
          .from('available_dates')
          .select('*')
          .order('datetime', { ascending: true });

        if (statusFilter !== 'all') {
          reloadQuery = reloadQuery.eq('status', statusFilter);
        }

        const { data: updatedData, error: reloadError } = await reloadQuery;

        if (reloadError) throw reloadError;
        setDates(updatedData || []);
      }
    } catch (error) {
      console.error('Error loading dates:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors du chargement des dates.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (editingDate) {
        // Check if date is available before updating
        const { data: dateCheck, error: checkError } = await supabase
          .from('available_dates')
          .select('status')
          .eq('id', editingDate.id)
          .single();

        if (checkError) throw checkError;

        if (dateCheck.status !== 'available') {
          throw new Error('Cette date n\'est plus disponible');
        }

        const { error } = await supabase
          .from('available_dates')
          .update({
            datetime: selectedDateTime,
          })
          .eq('id', editingDate.id)
          .eq('status', 'available'); // Only update if still available

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'La date a été modifiée avec succès !',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const { error } = await supabase
          .from('available_dates')
          .insert([
            {
              datetime: selectedDateTime,
              status: 'available',
            },
          ]);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'La nouvelle date a été ajoutée avec succès !',
          timer: 2000,
          showConfirmButton: false,
        });
      }
      
      setIsModalOpen(false);
      setSelectedDateTime('');
      setEditingDate(null);
    } catch (error) {
      console.error('Error saving date:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement de la date.',
      });
    }
  }

  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00a884',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        // Check if date is available before deleting
        const { data: dateCheck, error: checkError } = await supabase
          .from('available_dates')
          .select('status')
          .eq('id', id)
          .single();

        if (checkError) throw checkError;

        if (dateCheck.status !== 'available') {
          throw new Error('Cette date ne peut pas être supprimée car elle est réservée');
        }

        const { error } = await supabase
          .from('available_dates')
          .delete()
          .eq('id', id)
          .eq('status', 'available'); // Only delete if still available

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Supprimé !',
          text: 'La date a été supprimée avec succès.',
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Error deleting date:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression.',
        });
      }
    }
  }

  function handleEdit(date: AvailableDate) {
    if (date.status !== 'available') {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Cette date ne peut pas être modifiée car elle est réservée.',
      });
      return;
    }
    
    setEditingDate(date);
    setSelectedDateTime(new Date(date.datetime).toISOString().slice(0, 16));
    setIsModalOpen(true);
  }

  const getStatusBadge = (status: string) => {
    if (status === 'available') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Libre
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Réservé
      </span>
    );
  };

  const renderDateRows = (dates: AvailableDate[], isPast: boolean = false) => {
    return dates.map((date) => (
      <tr key={date.id} className={isPast ? 'bg-gray-50' : ''}>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {new Date(date.datetime).toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {getStatusBadge(date.status)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {date.client_name || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {date.client_phone || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => handleEdit(date)}
              className={`text-indigo-600 hover:text-indigo-900 ${
                date.status !== 'available' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={date.status !== 'available'}
            >
              <Pencil className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(date.id)}
              className={`text-red-600 hover:text-red-900 ${
                date.status !== 'available' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={date.status !== 'available'}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="flex-1 bg-[#f0f2f5] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des dates</h1>
          <div className="flex items-center space-x-4">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'booked')}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm leading-5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="available">Disponible</option>
                <option value="booked">Réservé</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <Filter className="h-4 w-4" />
              </div>
            </div>
            
            <button
              onClick={() => {
                setEditingDate(null);
                setSelectedDateTime('');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-whatsapp-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle date
            </button>
          </div>
        </div>

        {/* Dates List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date et Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Chargement des dates...
                  </td>
                </tr>
              ) : dates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Aucune date disponible
                  </td>
                </tr>
              ) : (
                <>
                  {/* Future Dates */}
                  {renderDateRows(sortedFutureDates)}
                  
                  {/* Past Dates */}
                  {sortedPastDates.length > 0 && (
                    <tr className="bg-gray-100">
                      <td colSpan={5} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dates passées
                      </td>
                    </tr>
                  )}
                  {renderDateRows(sortedPastDates, true)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Date Modal */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingDate(null);
                  }}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingDate ? 'Modifier la date' : 'Ajouter une nouvelle date'}
                  </h3>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="datetime" className="block text-sm font-medium text-gray-700 mb-2">
                        Date et Heure
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CalendarIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          id="datetime"
                          required
                          min={minDateTime}
                          className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                          value={selectedDateTime}
                          onChange={(e) => setSelectedDateTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-whatsapp-green text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        {editingDate ? 'Modifier' : 'Ajouter'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setEditingDate(null);
                        }}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}