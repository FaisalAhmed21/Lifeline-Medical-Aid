import React, { useEffect, useState, useCallback } from 'react';
import { FaFilePrescription, FaCheckCircle, FaPlus, FaTrash, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import PaymentPage from './PaymentPage';
import api from '../utils/api';

const emptyMedicine = { name: '', dose: '', duration: '', instructions: '' };

const DetailedPrescriptionPanel = ({ emergencyId, doctor, patient, currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [medicines, setMedicines] = useState([emptyMedicine]);
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [issuing, setIssuing] = useState(false);

  const isPatient = currentUser?.role === 'patient';
  const isDoctor = currentUser?.role === 'doctor';

  const fetchContext = useCallback(async () => {
    if (!emergencyId) return;
    try {
      setLoading(true);
      const response = await api.get(`/prescriptions/emergency/${emergencyId}`);
      if (response.data.success) {
        setContext(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load prescription context', error);
      toast.error(error.response?.data?.message || 'Failed to load prescription status');
    } finally {
      setLoading(false);
    }
  }, [emergencyId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const createOrder = async () => {
    if (!doctor) {
      toast.error('Doctor information is not available yet.');
      return;
    }

    const doctorId = doctor._id || doctor.id;
    if (!doctorId) {
      toast.error('Doctor information is incomplete.');
      return;
    }

    const paymentTo = doctor.bkashNumber || doctor.phone;
    if (!paymentTo) {
      toast.error('Doctor has not configured a bKash/phone number to receive payment.');
      return;
    }

    try {
      const fee = doctor.prescriptionFee || 50;
      const response = await api.post('/orders/create', {
        patientId: patient?._id || patient,
        doctorId,
        emergencyId: emergencyId,
        serviceType: 'PRESCRIPTION',
        amount: fee,
        paymentTo
      });

      if (response.data.success) {
        setActiveOrder(response.data.order);
        setShowPaymentModal(true);
        toast.info('Please complete payment to unlock the prescription editor.');
      }
    } catch (error) {
      console.error('Failed to create prescription order', error);
      toast.error(error.response?.data?.error || 'Failed to create payment order');
    }
  };

  const handlePaymentVerified = (verifiedOrder) => {
    setShowPaymentModal(false);
    setActiveOrder(null);
    toast.success('Payment verified! Let the doctor know inside the chat.');
    fetchContext();
  };

  const handleAddMedicine = () => {
    setMedicines((prev) => [...prev, { ...emptyMedicine }]);
  };

  const handleMedicineChange = (index, key, value) => {
    setMedicines((prev) => prev.map((item, idx) => (
      idx === index ? { ...item, [key]: value } : item
    )));
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length === 1) {
      toast.warn('At least one medicine is required.');
      return;
    }
    setMedicines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitPrescription = async () => {
    if (!context?.order || context.order.status !== 'paid') {
      toast.error('Prescription can only be issued after payment is completed.');
      return;
    }

    const hasEmptyFields = medicines.some(
      (med) => !med.name.trim() || !med.dose.trim() || !med.duration.trim()
    );
    if (hasEmptyFields) {
      toast.error('Please fill in name, dose, and duration for all medicines.');
      return;
    }

    try {
      setIssuing(true);
      await api.post('/prescriptions', {
        emergencyId,
        orderId: context.order.orderId,
        medicines,
        notes,
        followUpDate: followUpDate || undefined
      });

      toast.success('Prescription issued and saved!');
      setMedicines([emptyMedicine]);
      setNotes('');
      setFollowUpDate('');
      fetchContext();
      // Notify other components (e.g., the helper/doctor emergency view) that a prescription
      // was issued for this emergency so they can refresh their blocking checks.
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('prescriptionIssued', { detail: { emergencyId } }));
        }
      } catch (e) {
        console.warn('Could not dispatch prescriptionIssued event', e);
      }
    } catch (error) {
      console.error('Failed to issue prescription', error);
      toast.error(error.response?.data?.message || 'Failed to issue prescription');
    } finally {
      setIssuing(false);
    }
  };

  if (!doctor) {
    return null;
  }

  const order = context?.order;
  const prescription = context?.prescription;
  const orderStatus = order?.status;
  const pendingOrder = order && order.status === 'pending';
  const paidOrder = order && order.status === 'paid';
  const orderForPayment = activeOrder || order;
  const feeAmount = doctor.prescriptionFee || 50;

  return (
    <div className="bg-white border border-green-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <FaFilePrescription className="text-green-600 text-2xl" />
        <div>
          <p className="font-semibold text-green-900">Detailed Written Prescription</p>
          <p className="text-sm text-gray-600">
            Chat stays free. Pay once to unlock a formatted PDF prescription saved to the patient history.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Checking prescription status...</p>
      ) : (
        <>
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-800">
            {prescription ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  <span>Prescription issued on {new Date(prescription.createdAt || Date.now()).toLocaleString()}</span>
                </div>
                {prescription.downloadUrl && (
                  <a
                    href={prescription.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <FaDownload />
                    Download PDF
                  </a>
                )}
              </div>
            ) : (
              <>
                <p className="font-medium mb-1">
                  Status: {orderStatus ? orderStatus.toUpperCase() : 'No payment yet'}
                </p>
                <p>
                  Fee: <strong>{feeAmount} ৳</strong> — send to doctor&apos;s bKash to unlock the editor.
                </p>
              </>
            )}
          </div>

          {isPatient && !prescription && (
            <div className="flex flex-col sm:flex-row gap-3">
              {!order && (
                <button
                  onClick={createOrder}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
                >
                  Pay {feeAmount} ৳ for Prescription
                </button>
              )}

              {pendingOrder && (
                <button
                  onClick={() => {
                    setActiveOrder(order);
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-medium"
                >
                  Enter Transaction ID
                </button>
              )}

              {paidOrder && (
                <p className="text-sm text-green-700">
                  ✅ Payment verified. Let the doctor know you&apos;re ready for the prescription.
                </p>
              )}
            </div>
          )}

          {isDoctor && !prescription && (
            <div className="mt-4">
              {!paidOrder ? (
                <p className="text-sm text-gray-600">
                  Waiting for patient payment. The editor unlocks after payment is verified.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    {medicines.map((medicine, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-gray-700">Medicine #{index + 1}</p>
                          {medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicine(index)}
                              className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                            >
                              <FaTrash />
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                          placeholder="Medicine name"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={medicine.dose}
                          onChange={(e) => handleMedicineChange(index, 'dose', e.target.value)}
                          placeholder="Dose (e.g., 500mg, 1 tablet)"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          placeholder="Duration (e.g., 7 days, after meals)"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <textarea
                          value={medicine.instructions}
                          onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                          placeholder="Instructions (optional)"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    <FaPlus />
                    Add another medicine
                  </button>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Doctor notes / lifestyle instructions (optional)"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={3}
                  />

                  <label className="block text-sm text-gray-600">
                    Follow-up Date (optional)
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={submitPrescription}
                    disabled={issuing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-60"
                  >
                    {issuing ? 'Saving...' : 'Save & Send Prescription'}
                  </button>
                </div>
              )}
            </div>
          )}

          {prescription && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Medicines</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {prescription.medicines?.map((med, idx) => (
                  <div key={`${med.name}-${idx}`} className="p-3 border rounded-lg bg-gray-50 text-sm space-y-1">
                    <p className="font-semibold text-gray-900">{idx + 1}. {med.name}</p>
                    <p>Dose: {med.dose}</p>
                    <p>Duration: {med.duration}</p>
                    {med.instructions && <p>Instructions: {med.instructions}</p>}
                  </div>
                ))}
              </div>
              {prescription.notes && (
                <div className="mt-3 p-3 border rounded-lg bg-gray-50 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">Notes</p>
                  <p>{prescription.notes}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showPaymentModal && orderForPayment && (
        <PaymentPage
          order={orderForPayment}
          onVerified={handlePaymentVerified}
          onCancel={() => {
            setShowPaymentModal(false);
            setActiveOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default DetailedPrescriptionPanel;

