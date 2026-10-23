import React, { useState, useEffect } from "react";
import { Users, Shield, Trash2, Edit, Eye, Loader2, AlertCircle, CheckCircle, XCircle, Search, Filter, ChevronLeft, ChevronRight, Plus, ShieldAlert } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string | null;
  updated_at: string | null;
}

interface AdminStats {
  total_users: number;
  admin_users: number;
  active_users_30d: number;
  timestamp: string;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

function AdminPanel() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [perPage] = useState(20);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const response = await fetch("https://stockvision-backend-l5c7.onrender.com/api/admin/stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json() as Promise<AdminStats>;
    },
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["adminUsers", currentPage, searchTerm, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role_filter: roleFilter }),
      });
      const response = await fetch(`https://stockvision-backend-l5c7.onrender.com/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json() as Promise<UsersResponse>;
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`https://stockvision-backend-l5c7.onrender.com/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ new_role: role }),
      });
      if (!response.ok) throw new Error("Failed to update role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setEditingUser(null);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`https://stockvision-backend-l5c7.onrender.com/api/admin/users/${userId}/toggle-active`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to toggle status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`https://stockvision-backend-l5c7.onrender.com/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setConfirmDelete(null);
    },
  });

  const handleRoleChange = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleConfirmDelete = (userId: string) => {
    setConfirmDelete(userId);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800 border-purple-200";
      case "user": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (statsLoading || usersLoading) {
    return (
      <div className="admin-panel">
        <div className="admin-loading">
          <Loader2 className="spinner" />
          <span>جاري تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <Shield className="admin-icon" />
          <div>
            <h1 className="admin-title">لوحة التحكم الإدارية</h1>
            <p className="admin-subtitle">إدارة المستخدمين والصلاحيات</p>
          </div>
        </div>
        <div className="admin-stats-grid">
          <div className="stat-card total">
            <span className="stat-value">{stats?.total_users || 0}</span>
            <span className="stat-label">إجمالي المستخدمين</span>
          </div>
          <div className="stat-card admin">
            <span className="stat-value">{stats?.admin_users || 0}</span>
            <span className="stat-label">المدراء</span>
          </div>
          <div className="stat-card active">
            <span className="stat-value">{stats?.active_users_30d || 0}</span>
            <span className="stat-label">نشطون (30 يوم)</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="admin-controls">
        <div className="search-filter-group">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="بحث بالبريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <Filter className="filter-icon" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">جميع الأدوار</option>
              <option value="admin">مدير</option>
              <option value="user">مستخدم</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>تاريخ الإنشاء</th>
              <th>آخر تحديث</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {usersData?.users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="user-email">{user.email}</span>
                      <span className="user-id">ID: {user.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </td>
                <td>
                  {editingUser?.id === user.id ? (
                    <div className="role-edit">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="role-select"
                      >
                        <option value="user">مستخدم</option>
                        <option value="admin">مدير</option>
                        <option value="inactive">غير نشط</option>
                      </select>
                      <button
                        onClick={() => updateRoleMutation.mutate({ userId: user.id, role: newRole })}
                        disabled={updateRoleMutation.isPending}
                        className="btn-save"
                      >
                        {updateRoleMutation.isPending ? <Loader2 className="tiny" /> : <CheckCircle className="tiny" />}
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="btn-cancel"
                      >
                        <XCircle className="tiny" />
                      </button>
                    </div>
                  ) : (
                    <span className={`role-badge ${getRoleBadgeColor(user.role)}`}>
                      {user.role === "admin" && <Shield className="tiny" />}
                      {user.role === "user" ? "مستخدم" : user.role === "admin" ? "مدير" : "غير نشط"}
                    </span>
                  )}
                </td>
                <td>
                  {user.role !== "inactive" ? (
                    <span className="status-active">
                      <CheckCircle className="tiny" />
                      نشط
                    </span>
                  ) : (
                    <span className="status-inactive">
                      <XCircle className="tiny" />
                      معطل
                    </span>
                  )}
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>{formatDate(user.updated_at)}</td>
                <td>
                  <div className="actions-cell">
                    {user.id !== "current-user-id" ? (
                      <>
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              onClick={() => updateRoleMutation.mutate({ userId: user.id, role: newRole })}
                              disabled={updateRoleMutation.isPending}
                              className="action-btn save"
                              title="حفظ"
                            >
                              <CheckCircle className="small" />
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="action-btn cancel"
                              title="إلغاء"
                            >
                              <XCircle className="small" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRoleChange(user)}
                              className="action-btn edit"
                              title="تغيير الدور"
                            >
                              <Edit className="small" />
                            </button>
                            <button
                              onClick={() => toggleActiveMutation.mutate(user.id)}
                              disabled={toggleActiveMutation.isPending}
                              className={`action-btn ${user.role === "inactive" ? "activate" : "deactivate"}`}
                              title={user.role === "inactive" ? "تفعيل" : "تعطيل"}
                            >
                              {user.role === "inactive" ? <CheckCircle className="small" /> : <XCircle className="small" />}
                            </button>
                            <button
                              onClick={() => handleConfirmDelete(user.id)}
                              className="action-btn delete"
                              title="حذف"
                            >
                              <Trash2 className="small" />
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="self-protection">محمي</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {usersData && usersData.pagination.pages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="page-btn"
            >
              <ChevronLeft />
            </button>
            <span className="page-info">
              صفحة {currentPage} من {usersData.pagination.pages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(usersData.pagination.pages, p + 1))}
              disabled={currentPage >= usersData.pagination.pages}
              className="page-btn"
            >
              <ChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertCircle className="modal-icon" />
              <h3>تأكيد الحذف</h3>
            </div>
            <p>هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="modal-actions">
              <button onClick={() => setConfirmDelete(null)} className="btn-cancel">إلغاء</button>
              <button
                onClick={() => {
                  deleteUserMutation.mutate(confirmDelete);
                  setConfirmDelete(null);
                }}
                disabled={deleteUserMutation.isPending}
                className="btn-danger"
              >
                {deleteUserMutation.isPending ? <Loader2 className="small" /> : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;