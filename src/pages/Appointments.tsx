import React, { useState, useEffect } from 'react';
import { Search, Calendar, Clock, Phone, User, Mail, Car, PenTool as Tool, Droplets, Plus, X, Trash2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

interface Appointment {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  service: string;
  date_id: string;
  phone: string;
  email: string;
  status: string;
  fuel: string;
  created_at: string;
  available_date: {
    datetime: string;
  };
}

interface AvailableDate {
  id: string;
  datetime: string;
  status: 'available' | 'booked';
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    service: '',
    date_id: '',
    fuel: 'essence'
  });

  useEffect(() => {
    loadAppointments();
    loadAvailableDates();
  }, []);

  async function loadAvailableDates() {
    try {
      const { data, error } = await supabase
        .from('available_dates')
        .select('*')
        .eq('status', 'available')
        .order('datetime', { ascending: true });

      if (error) throw error;
      setAvailableDates(data || []);
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  }

  async function loadAppointments() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          available_date:date_id (datetime)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors du chargement des rendez-vous.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAppointment(appointment: Appointment) {
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
        // Delete the appointment
        const { error: appointmentError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointment.id);

        if (appointmentError) throw appointmentError;

        // Update the date status back to available
        const { error: dateError } = await supabase
          .from('available_dates')
          .update({ 
            status: 'available',
            client_name: null,
            client_phone: null
          })
          .eq('id', appointment.date_id);

        if (dateError) throw dateError;

        // Clear selected appointment if it was deleted
        if (selectedAppointment?.id === appointment.id) {
          setSelectedAppointment(null);
        }

        await Swal.fire({
          icon: 'success',
          title: 'Supprimé !',
          text: 'Le rendez-vous a été supprimé avec succès.',
          timer: 2000,
          showConfirmButton: false
        });

        // Reload appointments and available dates
        loadAppointments();
        loadAvailableDates();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de la suppression.',
        });
      }
    }
  }

  function handleEdit(appointment: Appointment) {
    setIsEditing(true);
    setFormData({
      name: appointment.name,
      phone: appointment.phone,
      email: appointment.email,
      brand: appointment.brand,
      model: appointment.model,
      year: appointment.year,
      service: appointment.service,
      date_id: appointment.date_id,
      fuel: appointment.fuel
    });
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (isEditing && selectedAppointment) {
        // If editing, update the existing appointment
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            brand: formData.brand,
            model: formData.model,
            year: formData.year,
            service: formData.service,
            fuel: formData.fuel
          })
          .eq('id', selectedAppointment.id);

        if (appointmentError) throw appointmentError;

        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Le rendez-vous a été modifié avec succès !',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        // If creating new, insert new appointment
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert([formData])
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        // Update the date status
        const { error: dateError } = await supabase
          .from('available_dates')
          .update({ 
            status: 'booked',
            client_name: formData.name,
            client_phone: formData.phone
          })
          .eq('id', formData.date_id);

        if (dateError) throw dateError;

        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Le rendez-vous a été créé avec succès !',
          timer: 2000,
          showConfirmButton: false,
        });
      }

      setIsModalOpen(false);
      setIsEditing(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        service: '',
        date_id: '',
        fuel: 'essence'
      });
      loadAppointments();
      loadAvailableDates();
    } catch (error) {
      console.error('Error saving appointment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de l\'enregistrement du rendez-vous.',
      });
    }
  }

  async function handleCancelAppointment(appointment: Appointment) {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Voulez-vous vraiment annuler ce rendez-vous ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00a884',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non, garder'
    });

    if (result.isConfirmed) {
      try {
        // Update appointment status
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment.id);

        if (appointmentError) throw appointmentError;

        // Free up the date
        const { error: dateError } = await supabase
          .from('available_dates')
          .update({ 
            status: 'available',
            client_name: null,
            client_phone: null
          })
          .eq('id', appointment.date_id);

        if (dateError) throw dateError;

        await Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Le rendez-vous a été annulé avec succès.',
          timer: 2000,
          showConfirmButton: false,
        });

        loadAppointments();
        loadAvailableDates();
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'annulation du rendez-vous.',
        });
      }
    }
  }

  const filteredAppointments = appointments.filter((appointment) => {
    const searchString = searchTerm.toLowerCase();
    return (
      appointment.name.toLowerCase().includes(searchString) ||
      appointment.phone.includes(searchString) ||
      appointment.email.toLowerCase().includes(searchString) ||
      appointment.brand.toLowerCase().includes(searchString) ||
      appointment.model.toLowerCase().includes(searchString) ||
      appointment.fuel.toLowerCase().includes(searchString)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Confirmé
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  const getFuelIcon = (fuel: string) => {
    switch (fuel.toLowerCase()) {
      case 'essence':
        return 'text-red-500';
      case 'diesel':
        return 'text-blue-500';
      case 'hybride':
        return 'text-green-500';
      case 'électrique':
        return 'text-yellow-500';
      case 'gpl':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex-1 flex bg-[#f0f2f5]">
      {/* Appointments List */}
      <div className="w-1/2 border-r border-whatsapp-border bg-white">
        <div className="p-4 border-b border-whatsapp-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Rendez-Vous</h2>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: '',
                  phone: '',
                  email: '',
                  brand: '',
                  model: '',
                  year: new Date().getFullYear(),
                  service: '',
                  date_id: '',
                  fuel: 'essence'
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-whatsapp-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau rendez-vous
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un rendez-vous..."
              className="w-full pl-10 pr-4 py-2 bg-whatsapp-panel rounded-lg text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-180px)] scrollbar-w-2 scrollbar-track-transparent scrollbar-thumb-gray scrollbar-thumb-rounded">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Chargement des rendez-vous...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Aucun rendez-vous trouvé</div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`p-4 border-b border-whatsapp-border hover:bg-whatsapp-panel cursor-pointer ${
                  selectedAppointment?.id === appointment.id ? 'bg-whatsapp-panel' : ''
                }`}
                onClick={() => setSelectedAppointment(appointment)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{appointment.name}</h3>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Car className="h-4 w-4 mr-1" />
                      <span>{appointment.brand} {appointment.model} ({appointment.year})</span>
                    </div>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Droplets className={`h-4 w-4 mr-1 ${getFuelIcon(appointment.fuel)}`} />
                      <span className="capitalize">{appointment.fuel}</span>
                    </div>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Tool className="h-4 w-4 mr-1" />
                      <span>{appointment.service}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">{getStatusBadge(appointment.status)}</div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(appointment.available_date.datetime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{new Date(appointment.available_date.datetime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Appointment Details */}
      <div className="w-1/2 bg-white">
        {selectedAppointment ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Détails du Rendez-Vous</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(selectedAppointment)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDeleteAppointment(selectedAppointment)}
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
                    <h3 className="font-medium text-lg">{selectedAppointment.name}</h3>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{selectedAppointment.phone}</span>
                    </div>
                  </div>
                </div>
                <div>{getStatusBadge(selectedAppointment.status)}</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm text-gray-500">Email</h3>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-gray-900">{selectedAppointment.email}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-500">Véhicule</h3>
                  <div className="flex items-center mt-1">
                    <Car className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-gray-900">
                      {selectedAppointment.brand} {selectedAppointment.model} ({selectedAppointment.year})
                    </p>
                  </div>
                  <div className="flex items-center mt-1">
                    <Droplets className={`h-4 w-4 mr-2 ${getFuelIcon(selectedAppointment.fuel)}`} />
                    <p className="text-gray-900 capitalize">{selectedAppointment.fuel}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-500">Service demandé</h3>
                  <div className="flex items-center mt-1">
                    <Tool className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-gray-900">{selectedAppointment.service}</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-500">Date</h3>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <p className="text-gray-900">
                        {new Date(selectedAppointment.available_date.datetime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-500">Heure</h3>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <p className="text-gray-900">
                        {new Date(selectedAppointment.available_date.datetime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex space-x-4">
                <button 
                  className="flex-1 bg-whatsapp-green text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  onClick={() => window.location.href = `tel:${selectedAppointment.phone}`}
                >
                  Appeler le client
                </button>
                {selectedAppointment.status === 'confirmed' && (
                  <button 
                    className="flex-1 border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
                    onClick={() => handleCancelAppointment(selectedAppointment)}
                  >
                    Annuler le rendez-vous
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-6">
              <Calendar className="h-16 w-16 text-whatsapp-green mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">Aucun rendez-vous sélectionné</h3>
              <p className="text-gray-500">Sélectionnez un rendez-vous pour voir les détails</p>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Appointment Modal */}
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
                    {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                  </h3>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Client Information */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Nom complet
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

                      {/* Vehicle Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                            Marque
                          </label>
                          <input
                            type="text"
                            id="brand"
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          />
                        </div>

                        <div>
                          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                            Modèle
                          </label>
                          <input
                            type="text"
                            id="model"
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={formData.model}
                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                            Année
                          </label>
                          <input
                            type="number"
                            id="year"
                            required
                            min="1900"
                            max={new Date().getFullYear()}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                          />
                        </div>

                        <div>
                          <label htmlFor="fuel" className="block text-sm font-medium text-gray-700">
                            Carburant
                          </label>
                          <select
                            id="fuel"
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={formData.fuel}
                            onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                          >
                            <option value="essence">Essence</option>
                            <option value="diesel">Diesel</option>
                            <option value="hybride">Hybride</option>
                            <option value="électrique">Électrique</option>
                            <option value="gpl">GPL</option>
                          </select>
                        </div>
                      </div>

                      {/* Service and Date */}
                      <div>
                        <label htmlFor="service" className="block text-sm font-medium text-gray-700">
                          Service demandé
                        </label>
                        <input
                          type="text"
                          id="service"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          value={formData.service}
                          onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        />
                      </div>

                      {!isEditing && (
                        <div>
                          <label htmlFor="date_id" className="block text-sm font-medium text-gray-700">
                            Date et heure
                          </label>
                          <select
                            id="date_id"
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            value={formData.date_id}
                            onChange={(e) => setFormData({ ...formData, date_id: e.target.value })}
                          >
                            <option value="">Sélectionnez une date</option>
                            {availableDates.map((date) => (
                              <option key={date.id} value={date.id}>
                                {new Date(date.datetime).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                 type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-whatsapp-green text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        {isEditing ? 'Modifier' : 'Créer'}
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