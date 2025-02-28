const db = require('../config/db');

const Patient = {
    // Membuat data pasien baru
    create: async (data) => {
        // Destructure without status
        const {
            nik,
            name,
            place_of_birth,
            date_of_birth,
            address,
            number_phone,
            email
        } = data;

        // Validasi NIK (16 digit)
        if (!nik || nik.length !== 16) {
            throw new Error('NIK must be exactly 16 characters long');
        }

        // Validasi nomor telepon (11-12 digit)
        if (!number_phone || number_phone.length < 11 || number_phone.length > 12) {
            throw new Error('Phone number must be between 11 and 12 characters long');
        }

        // Validasi karakter NIK (hanya angka)
        if (!/^\d+$/.test(nik)) {
            throw new Error('NIK must contain only numeric characters');
        }

        // Validasi karakter nomor telepon (hanya angka)
        if (!/^\d+$/.test(number_phone)) {
            throw new Error('Phone number must contain only numeric characters');
        }

        // Validasi input wajib
        const requiredFields = [
            'nik', 'name', 'place_of_birth', 'date_of_birth',
            'address', 'number_phone', 'email'
        ];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`${field.replace('_', ' ')} is required`);
            }
        }

        // Validasi email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Set status default ke 'active'
        const status = 'active';

        // Masukkan data awal tanpa barcode dan patient_code
        const [result] = await db.query(
            'INSERT INTO patients (nik, name, place_of_birth, date_of_birth, address, number_phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nik, name, place_of_birth, date_of_birth, address, number_phone, email, status]
        );

        // Generate barcode dan patient_code berdasarkan ID pasien yang baru dibuat
        const id = result.insertId;
        const patient_code = `PAT${id.toString().padStart(6, '0')}`; // Format: PAT000001
        const barcode = `BC${id.toString().padStart(8, '0')}`;      // Format: BC00000001

        // Update pasien dengan barcode dan patient_code
        await db.query('UPDATE patients SET patient_code = ?, barcode = ? WHERE id = ?', [patient_code, barcode, id]);

        // Kembalikan data pasien
        return { id, patient_code, barcode, nik, name, place_of_birth, date_of_birth, address, number_phone, email, status };
    },


    // Mendapatkan semua data pasien// Mendapatkan data pasien dengan pagination
    // Mendapatkan data pasien dengan pagination dan filter pencarian
    getAllWithPagination: async (limit, offset, search = '') => {
        // Menggunakan parameter search dalam query dan memastikan pasien dengan id = 0 tidak ditampilkan
        const query = `
        SELECT * FROM patients
        WHERE (name LIKE ? OR patient_code LIKE ? OR barcode LIKE ? OR nik LIKE ?)
        AND id != 0
        LIMIT ? OFFSET ?
    `;
        const [rows] = await db.query(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]);
        return rows;
    },

    // Mendapatkan total jumlah pasien, tanpa menghitung pasien dengan id = 0
    getTotalCount: async () => {
        const [rows] = await db.query(`SELECT COUNT(*) AS count FROM patients WHERE id != 0`);
        return rows[0].count;
    },

    // Mendapatkan pasien berdasarkan ID
    getById: async (id) => {
        const [rows] = await db.query(`SELECT * FROM patients WHERE id = ?`, [id]);
        return rows[0] || null;
    },

    // Memperbarui data pasien
    update: async (id, data) => {
        const {
            nik,
            name,
            place_of_birth,
            date_of_birth,
            address,
            number_phone,
            email,
            status
        } = data;

        // Validasi NIK (16 digit)
        if (nik && (nik.length !== 16 || !/^\d+$/.test(nik))) {
            throw new Error('NIK must be exactly 16 numeric characters');
        }

        // Validasi nomor telepon (11-12 digit)
        if (number_phone && (number_phone.length < 11 || number_phone.length > 12 || !/^\d+$/.test(number_phone))) {
            throw new Error('Phone number must be 11-12 numeric characters');
        }

        // Validasi email
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }
        }

        // Validasi status jika diubah
        if (status && !['active', 'inactive'].includes(status)) {
            throw new Error('Status must be either "active" or "inactive"');
        }

        // Siapkan fields yang akan diupdate
        const updateFields = {};
        const updateValues = [];

        // Tambahkan field yang akan diupdate
        if (nik) {
            updateFields.nik = nik;
            updateValues.push(nik);
        }
        if (name) {
            updateFields.name = name;
            updateValues.push(name);
        }
        if (place_of_birth) {
            updateFields.place_of_birth = place_of_birth;
            updateValues.push(place_of_birth);
        }
        if (date_of_birth) {
            updateFields.date_of_birth = date_of_birth;
            updateValues.push(date_of_birth);
        }
        if (address) {
            updateFields.address = address;
            updateValues.push(address);
        }
        if (number_phone) {
            updateFields.number_phone = number_phone;
            updateValues.push(number_phone);
        }
        if (email) {
            updateFields.email = email;
            updateValues.push(email);
        }
        if (status) {
            updateFields.status = status;
            updateValues.push(status);
        }

        // Jika tidak ada field yang diupdate, kembalikan null
        if (Object.keys(updateFields).length === 0) {
            throw new Error('No update fields provided');
        }

        // Buat query dinamis
        const setClause = Object.keys(updateFields)
            .map(field => `${field} = ?`)
            .join(', ');

        // Tambahkan id ke akhir values
        updateValues.push(id);

        // Jalankan query update
        const [result] = await db.query(
            `UPDATE patients SET ${setClause} WHERE id = ?`,
            updateValues
        );

        // Kembalikan data yang diupdate jika berhasil
        return result.affectedRows > 0
            ? { id, ...updateFields }
            : null;
    },

    // Menghapus data pasien
    delete: async (id) => {
        const [result] = await db.query(`DELETE FROM patients WHERE id = ?`, [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Patient;



// getAllWithPagination: async (limit, offset) => {
//     const [rows] = await db.query(`SELECT * FROM patients LIMIT ? OFFSET ?`, [limit, offset]);
//     return rows;
// },

//get patient by status only active
// getAllWithPagination: async (limit, offset) => {
//     const [rows] = await db.query(`SELECT * FROM patients WHERE status = 'active' LIMIT ? OFFSET ?`, [limit, offset]);
//     return rows;
// },