const db = require('../config/db');

const MappingPatient = {
    // Membuat data pasien baru
    create: async (data) => {
        const {
            no_rm,
            no_registrasi,
            lab_number,
            referral_doctor,
            room,
            nik,
            name,
            gender,
            place_of_birth,
            date_of_birth,
            address,
            number_phone,
            email
        } = data;

        const errors = {};
        const requiredFields = [
            "no_rm", "no_registrasi", "lab_number", "referral_doctor", "room",
            "name", "gender", "place_of_birth", "date_of_birth",
            "address"
        ];

        requiredFields.forEach(field => {
            if (!data[field]) {
                errors[field] = `${field.replace('_', ' ')} is required`;
            }
        });

        // Validasi NIK
        if (nik && (nik.length !== 16 || !/^\d+$/.test(nik))) {
            errors.nik = "NIK must be exactly 16 digits and contain only numbers";
        }

        // Validasi nomor telepon
        if (number_phone) {
            if (!/^\d+$/.test(number_phone)) {
                errors.number_phone = "Phone number must contain only numbers";
            } else if (number_phone.length < 11 || number_phone.length > 13) {
                errors.number_phone = "Phone number must be between 11 and 13 digits";
            } else if (!number_phone.startsWith("08")) {
                errors.number_phone = "Invalid Phone Number, must start with '08'";
            }
        }

        // Validasi email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            errors.email = "Invalid email format";
        }

        if (Object.keys(errors).length > 0) {
            throw new Error(JSON.stringify(errors));
        }

        // Set status default
        const status = 'active';

        // Masukkan data ke mapping_patients TERLEBIH DAHULU
        const [resultMapping] = await db.query(
            'INSERT INTO mapping_patients (no_rm, no_registrasi, lab_number, referral_doctor, room, nik, name, gender, place_of_birth, date_of_birth, address, number_phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [no_rm, no_registrasi, lab_number, referral_doctor, room, nik || null, name, gender, place_of_birth, date_of_birth, address, number_phone || null, email || null, status]
        );

        // Sekarang setelah resultMapping ada, kita bisa ambil insertId
        const id = resultMapping.insertId;

        // Generate kode pasien dan barcode
        const patient_code = `PAT${id.toString().padStart(6, '0')}`;
        const barcode = `BC${id.toString().padStart(8, '0')}`;

        // Update record dengan patient_code dan barcode
        await db.query(
            'UPDATE mapping_patients SET patient_code = ?, barcode = ? WHERE id = ?',
            [patient_code, barcode, id]
        );

        // Masukkan juga ke tabel patients
        await db.query(
            'INSERT INTO patients (no_rm, no_registrasi, lab_number, referral_doctor, room, nik, name, gender, place_of_birth, date_of_birth, address, number_phone, email, status, patient_code, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [no_rm, no_registrasi, lab_number, referral_doctor, room, nik, name, gender, place_of_birth, date_of_birth, address, number_phone || null, email || null, status, patient_code, barcode]
        );

        // Kembalikan data pasien
        return {
            id,
            patient_code,
            barcode,
            no_rm,
            no_registrasi,
            lab_number,
            referral_doctor,
            room,
            nik,
            name,
            gender,
            place_of_birth,
            date_of_birth,
            address,
            number_phone,
            email,
            status
        };
    },

    // Mendapatkan data pasien dengan pagination dan filter pencarian
    getAllWithPagination: async (limit, offset, search = '') => {
        // Menggunakan parameter search dalam query dan memastikan pasien dengan id = 0 tidak ditampilkan
        const query = `
            SELECT * 
            FROM mapping_patients
            WHERE (name LIKE ? OR patient_code LIKE ? OR barcode LIKE ? OR nik LIKE ?)
            AND id != 0
            AND created_at IS NOT NULL
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(query, [
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            limit,
            offset
        ]);
        return rows;
    },

    // Mendapatkan total jumlah pasien, tanpa menghitung pasien dengan id = 0
    getTotalCount: async () => {
        const [rows] = await db.query(`SELECT COUNT(*) AS count FROM mapping_patients WHERE id != 0`);
        return rows[0].count;
    },

    // Mendapatkan pasien berdasarkan ID
    getById: async (id) => {
        const [rows] = await db.query(`SELECT * FROM mapping_patients WHERE id = ?`, [id]);
        return rows[0] || null;
    },


    totalPatientsPerMonth: async () => {
        const [rows] = await db.query(`
            SELECT 
                MONTH(created_at) AS month, 
                COUNT(*) AS total_patients 
            FROM patients
            WHERE id != 0 AND created_at IS NOT NULL
            GROUP BY MONTH(created_at)
            ORDER BY MONTH(created_at) ASC
        `);
        return rows;
    },


    // Memperbarui data pasien
    update: async (id, data) => {
        const {
            no_rm,
            no_registrasi,
            lab_number,
            referral_doctor,
            room,
            nik,
            name,
            gender,
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
        if (no_rm) {
            updateFields.no_rm = no_rm;
            updateValues.push(no_rm);
        }
        if (no_registrasi) {
            updateFields.no_registrasi = no_registrasi;
            updateValues.push(no_registrasi);
        }
        if (lab_number) {
            updateFields.lab_number = lab_number;
            updateValues.push(lab_number);
        }
        if (referral_doctor) {
            updateFields.referral_doctor = referral_doctor;
            updateValues.push(referral_doctor);
        }
        if (room) {
            updateFields.room = room;
            updateValues.push(room);
        }

        if (nik) {
            updateFields.nik = nik;
            updateValues.push(nik);
        }
        if (name) {
            updateFields.name = name;
            updateValues.push(name);
        }
        if (gender) {
            updateFields.gender = gender;
            updateValues.push(gender);
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
            `UPDATE mapping_patients SET ${setClause} WHERE id = ?`,
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
    },

};

module.exports = MappingPatient;