import React, { useState, useEffect } from 'react';
import { Search, FileText, User, Phone, Mail, Plus, X, Trash2, Pencil } from 'lucide-react';
import { getQuotes, createQuote, updateQuote, deleteQuote } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Quote } from '../types';
import Swal from 'sweetalert2';

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_number: '',
    email: '',
    amount: 0,
    details: '',
  });

  useEffect(() => {
    loadQuotes();

    // Subscribe to real-time updates
    const quotesSubscription = supabase
      .channel('quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        async (payload) => {
          // Reload quotes to get the latest state
          await loadQuotes();
          
          // If we're viewing a quote that was updated, refresh its details
          if (selectedQuote?.id === payload.new?.id) {
            const updatedQuote = await getQuotes();
            const quote = updatedQuote.find(q => q.id === payload.new.id);
            if (quote) {
              setSelectedQuote(quote);
            }
          }
        }
      )
      .subscribe();

    return () => {
      quotesSubscription.unsubscribe();
    };
  }, [selectedQuote]);

  async function loadQuotes() {
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (error) {
      console.error('Failed to load quotes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors du chargement des devis.',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredQuotes = quotes.filter(
    (quote) =>
      quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.phone_number.includes(searchTerm) ||
      quote.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleEdit(quote: Quote) {
    setFormData({
      customer_name: quote.customer_name,
      phone_number: quote.phone_number,
      email: quote.email,
      amount: quote.amount,
      details: quote.details,
    });
    setSelectedQuote(quote);
    setIsEditing(true);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEditing && selectedQuote) {
        await updateQuote(selectedQuote.id, formData);
        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Le devis a été modifié avec succès !',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await createQuote({
          ...formData,
          status: 'pending',
        });
        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Le devis a été créé avec succès !',
          timer: 2000,
          showConfirmButton: false,
        });
      }

      setIsModalOpen(false);
      setIsEditing(false);
      setFormData({
        customer_name: '',
        phone_number: '',
        email: '',
        amount: 0,
        details: '',
      });
      
      // Reload quotes to show the latest changes
      await loadQuotes();
    } catch (error) {
      console.error('Failed to save quote:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de l\'enregistrement du devis.',
      });
    }
  }

  async function handleUpdateQuoteStatus(quote: Quote, newStatus: Quote['status']) {
    try {
      const updatedQuote = await updateQuote(quote.id, { status: newStatus });
      setSelectedQuote(updatedQuote);

      await Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Le statut du devis a été mis à jour !',
        timer: 2000,
        showConfirmButton: false,
      });
      
      // Reload quotes to show the latest changes
      await loadQuotes();
    } catch (error) {
      console.error('Failed to update quote:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la mise à jour du devis.',
      });
    }
  }

  async function handleDeleteQuote(quote: Quote) {
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
        await deleteQuote(quote.id);
        if (selectedQuote?.id === quote.id) {
          setSelectedQuote(null);
        }

        await Swal.fire({
          icon: 'success',
          title: 'Supprimé !',
          text: 'Le devis a été supprimé avec succès.',
          timer: 2000,
          showConfirmButton: false,
        });
        
        // Reload quotes to show the latest changes
        await loadQuotes();
      } catch (error) {
        console.error('Failed to delete quote:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de la suppression du devis.',
        });
      }
    }
  }

  const getStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            En attente
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Accepté
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            Refusé
          </span>
        );
    }
  };

  // Format number to include thousands separator
  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })} FCFA`;
  };

  return (
    <div className="flex-1 flex bg-[#f0f2f5]">
      {/* Quotes List */}
      <div className="w-1/2 border-r border-whatsapp-border bg-white">
        <div className="p-4 border-b border-whatsapp-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Devis Clients</h2>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  customer_name: '',
                  phone_number: '',
                  email: '',
                  amount: 0,
                  details: '',
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-whatsapp-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau devis
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un devis..."
              className="w-full pl-10 pr-4 py-2 bg-whatsapp-panel rounded-lg text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-180px)] scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-gray scrollbar-thumb-rounded">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Chargement des devis...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Aucun devis trouvé</div>
          ) : (
            filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                className={`p-4 border-b border-whatsapp-border hover:bg-whatsapp-panel cursor-pointer ${
                  selectedQuote?.id === quote.id ? 'bg-whatsapp-panel' : ''
                }`}
                onClick={() => setSelectedQuote(quote)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-medium text-lg truncate">{quote.customer_name}</h3>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Phone className="h-4 w-4 flex-shrink-0 mr-1" />
                      <span className="truncate">{quote.phone_number}</span>
                    </div>
                    <p className="text-gray-600 mt-2 text-sm line-clamp-2">{quote.details}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="mb-2">{getStatusBadge(quote.status)}</div>
                    <div className="text-whatsapp-green font-medium whitespace-nowrap">
                      {formatAmount(quote.amount)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quote Details */}
      <div className="w-1/2 bg-white">
        {selectedQuote ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Détails du Devis</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(selectedQuote)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDeleteQuote(selectedQuote)}
                  className="inline-flex items-center px-3 py-2 border border-red-500 text-sm leading-4 font-medium rounded-md text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </button>
              </div>
            </div>
            
            <div className="bg-whatsapp-panel rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-whatsapp-green flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-lg">{selectedQuote.customer_name}</h3>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{selectedQuote.phone_number}</span>
                    </div>
                  </div>
                </div>
                <div>{getStatusBadge(selectedQuote.status)}</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm text-gray-500">Email</h3>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-gray-900">{selectedQuote.email}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-500">Date de demande</h3>
                  <p className="text-gray-900 mt-1">
                    {new Date(selectedQuote.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm text-gray-500">Montant</h3>
                  <p className="text-2xl font-bold text-whatsapp-green mt-1">
                    {formatAmount(selectedQuote.amount)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm text-gray-500">Détails</h3>
                  <div className="mt-2 p-4 bg-white rounded-lg border border-whatsapp-border">
                    <p className="text-gray-800">{selectedQuote.details}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex space-x-4">
                <button
                  onClick={() => window.location.href = `tel:${selectedQuote.phone_number}`}
                  className="flex-1 bg-whatsapp-green text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Contacter le client
                </button>
                {selectedQuote.status === 'pending' && (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateQuoteStatus(selectedQuote, 'accepted')}
                      className="bg-green-100 text-green-800 py-2 px-4 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => handleUpdateQuoteStatus(selectedQuote, 'rejected')}
                      className="bg-red-100 text-red-800 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-6">
              <FileText className="h-16 w-16 text-whatsapp-green mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">Aucun devis sélectionné</h3>
              <p className="text-gray-500">Sélectionnez un devis pour voir les détails</p>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Quote Modal */}
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
                    setIsEditing(false);
                  }}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {isEditing ? 'Modifier le devis' : 'Nouveau devis'}
                  </h3>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                          Nom du client
                        </label>
                        <input
                          type="text"
                          id="customer_name"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.customer_name}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          id="phone_number"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.phone_number}
                          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                          Montant (FCFA)
                        </label>
                        <input
                          type="number"
                          id="amount"
                          required
                          min="0"
                          step="1"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        />
                      </div>

                      <div>
                        <label htmlFor="details" className="block text-sm font-medium text-gray-700">
                          Détails
                        </label>
                        <textarea
                          id="details"
                          required
                          rows={4}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.details}
                          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-whatsapp-green text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        {isEditing ? 'Enregistrer les modifications' : 'Créer le devis'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setIsEditing(false);
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