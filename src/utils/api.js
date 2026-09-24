import { API_BASE_URL, FALLBACK_API_URLS } from '../config';

// Helper function for API calls with timeout

export async function apiCall(endpoint, options = {}) {
  const API_URLS = [API_BASE_URL, ...FALLBACK_API_URLS].filter((url, index, self) =>
    self.indexOf(url) === index
  );

  let lastError = null;

  for (const baseURL of API_URLS) {
    try {
      const url = `${baseURL}${endpoint}`;
      const defaultOptions = { headers: {} };
      const mergedOptions = { ...defaultOptions, ...options };

      if (!options.body || !(options.body instanceof FormData)) {
        mergedOptions.headers = {
          'Content-Type': 'application/json',
          ...mergedOptions.headers,
        };
      }

      const response = await fetch(url, {
        ...mergedOptions,
        credentials: 'omit'
      });

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { message: text };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.warn(`API call failed for ${baseURL}${endpoint}:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw new Error(lastError?.message || 'Failed to connect to any API endpoint');
}

/**
 * Student APIs
 */

export async function applyStudent(form) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(form)) {
    if (value !== undefined && value !== null) {
      if (['photo', 'aadharPhoto', 'collegeIdPhoto'].includes(key)) {
        if (value instanceof File) {
          formData.append(key, value);
        }
      } else {
        formData.append(key, value);
      }
    }
  }

  try {
    return await apiCall('/student/apply', {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    throw new Error(error.message || 'Failed to submit application.');
  }
}

export async function studentLogin(regNo, dob) {
  return apiCall(`/student/login`, {
    method: "POST",
    body: JSON.stringify({ regNo, dob }),
  });
}

export async function getStudentStatus(regNo) {
  return apiCall(`/student/status/${regNo}`);
}

export async function createPaymentOrder(regNo, amount) {
  return apiCall('/student/create-payment-order', {
    method: 'POST',
    body: JSON.stringify({ regNo, amount }),
  });
}

export async function verifyPayment(regNo, paymentData) {
  return apiCall('/student/verify-payment', {
    method: 'POST',
    body: JSON.stringify({ regNo, ...paymentData }),
  });
}

export async function getPaymentStatus(regNo) {
  return apiCall(`/student/payment-status/${regNo}`);
}

export async function uploadFeesBill(regNo, file) {
  const formData = new FormData();
  formData.append('regNo', regNo);
  formData.append('feesBill', file);
  return apiCall('/student/upload-fees-bill', {
    method: 'POST',
    body: formData,
  });
}

export async function requestCancellation(regNo, reason) {
  return apiCall('/student/request-cancellation', {
    method: 'POST',
    body: JSON.stringify({ regNo, reason }),
  });
}

export const requestPassCancellation = requestCancellation;

export async function checkCancellationStatus(regNo) {
  return apiCall(`/student/cancellation-status/${regNo}`);
}

export async function getStudentPass(regNo) {
  return apiCall(`/student/pass/${regNo}`);
}

export async function getStudentDetails(regNo) {
  return apiCall(`/student/details/${regNo}`);
}

export async function verifyPassData(regNo) {
  return apiCall(`/student/verify-pass/${regNo}`);
}

export async function getRouteFee(route) {
  return apiCall(`/student/get-fee/${encodeURIComponent(route)}`);
}

/**
 * Admin APIs
 */

export async function adminLogin(username, password) {
  return apiCall(`/admin/login`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getApplications(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return apiCall(`/admin/applications${params ? `?${params}` : ''}`);
}

export async function approveApplication(id) {
  return apiCall(`/admin/approve`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function rejectApplication(id, reason) {
  return apiCall(`/admin/reject`, {
    method: "POST",
    body: JSON.stringify({ id, reason }),
  });
}

export async function deleteApplication(id) {
  return apiCall(`/admin/applications/${id}`, {
    method: "DELETE",
  });
}

export async function updateApplication(id, data) {
  return apiCall(`/admin/applications/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function approvePaymentPass(id) {
  return apiCall(`/admin/approve-payment-pass`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function rejectPaymentPass(id, reason) {
  return apiCall(`/admin/reject-payment-pass`, {
    method: "POST",
    body: JSON.stringify({ id, reason }),
  });
}


export async function getPaymentDetails() {
  return apiCall('/admin/payment-details');
}

export async function exportPaymentsToExcel() {
  window.location.href = `${API_BASE_URL}/admin/export-payments-excel`;
}

export async function processCancellationRequest(id, action) {
  return apiCall(`/admin/process-cancellation/${id}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

/**
 * Route & Fee APIs
 */

export async function getRouteFees() {
  return apiCall(`/admin/route-fees`);
}

export async function addRouteFee(routeData) {
  return apiCall(`/admin/route-fees`, {
    method: "POST",
    body: JSON.stringify(routeData),
  });
}

export const createRouteFee = addRouteFee;

export async function deleteRouteFee(id) {
  return apiCall(`/admin/route-fees/${id}`, {
    method: "DELETE",
  });
}

export async function updateRouteFee(id, routeData) {
  return apiCall(`/admin/route-fees/${id}`, {
    method: "PUT",
    body: JSON.stringify(routeData),
  });
}

/**
 * Bus Management APIs
 */

export async function getBusRoutes() {
  return apiCall('/admin/bus-routes');
}

export async function getBusSeatCounts() {
  return apiCall('/admin/bus-seat-counts');
}

export async function addBusRoute(busData) {
  return apiCall('/admin/bus-routes', {
    method: 'POST',
    body: JSON.stringify(busData),
  });
}

export const createBusRoute = addBusRoute;

export async function deleteBusRoute(id) {
  return apiCall(`/admin/bus-routes/${id}`, {
    method: 'DELETE',
  });
}

export async function updateBusRoute(id, busData) {
  return apiCall(`/admin/bus-routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(busData),
  });
}

/**
 * Cancellation Approval APIs
 */

export async function getCancellationRequests() {
  return apiCall('/admin/cancellation-requests');
}

export async function hodApproveCancellation(id) {
  return apiCall(`/admin/hod-approve-cancellation`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function hodDeclineCancellation(id) {
  return apiCall(`/admin/hod-decline-cancellation`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function principalApproveCancellation(id) {
  return apiCall(`/admin/principal-approve-cancellation`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function principalDeclineCancellation(id) {
  return apiCall(`/admin/principal-decline-cancellation`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function adminApproveCancellation(id) {
  return apiCall(`/admin/admin-approve-cancellation`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function adminDeclineCancellation(id) {
  return apiCall(`/admin/admin-decline-cancellation`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

// Notifications API
export async function getNotifications() {
  return apiCall(`/notifications`);
}

export async function createNotification(notificationData) {
  return apiCall(`/notifications`, {
    method: "POST",
    body: JSON.stringify(notificationData),
  });
}

export async function deleteNotification(id) {
  return apiCall(`/notifications/${id}`, {
    method: "DELETE",
  });
}

// System Settings API
export async function getSystemSettings() {
  return apiCall(`/student/system-settings`);
}

export async function getAdminSettings() {
  return apiCall(`/admin/settings`);
}

export async function updateSystemSetting(key, value) {
  return apiCall(`/admin/update-setting`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

// Password Management
export async function resetPassword(username, oldPassword, newPassword) {
  return apiCall(`/admin/reset-password`, {
    method: "POST",
    body: JSON.stringify({ username, oldPassword, newPassword }),
  });
}

export async function getStaffUsers() {
  return apiCall(`/admin/staff-users`);
}

export async function forceResetPassword(targetUsername, newPassword, adminToken) {
  return apiCall(`/admin/force-reset-password`, {
    method: "POST",
    body: JSON.stringify({ targetUsername, newPassword, adminToken }),
  });
}

export async function addStaff(staffData) {
  const adminToken = localStorage.getItem('adminToken');
  return apiCall(`/admin/add-staff`, {
    method: "POST",
    body: JSON.stringify({ ...staffData, adminToken }),
  });
}

// ── Payment Management ─────────────────────────────────────────────────────────
export async function markPayment(id, payment_type, note = '') {
  return apiCall(`/admin/mark-payment`, {
    method: 'POST',
    body: JSON.stringify({ id, payment_type, note }),
  });
}


// ── Colleges & Departments APIs ────────────────────────────────────────────────

export async function getColleges() {
  return apiCall(`/public/colleges`);
}

export async function getAdminColleges() {
  return apiCall(`/admin/colleges`);
}

export async function createCollege(data) {
  return apiCall(`/admin/colleges`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCollege(id, data) {
  return apiCall(`/admin/colleges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCollege(id) {
  return apiCall(`/admin/colleges/${id}`, {
    method: 'DELETE',
  });
}