const db = require('../config/db');

class TestGlucosaModel {
    // Tambahkan tes gula darah baru
    // static async create(data) {
    //     const [result] = await db.query(
    //         'INSERT INTO glucosa_tests (date_time, glucos_value, unit, patient_id) VALUES (?, ?, ?, ?)',
    //         [data.date_time, data.glucos_value, data.unit, data.patient_id]
    //     );
    //     return result.insertId;
    // }

    static async create(data) {
        // Pastikan patient_id tidak null, jika null set ke 0
        const patientId = data.patient_id ? data.patient_id : 0;

        const [result] = await db.query(
            'INSERT INTO glucosa_tests (date_time, glucos_value, unit, patient_id, device_name) VALUES (?, ?, ?, ?, ?)',
            [data.date_time, data.glucos_value, data.unit, patientId, data.device_name] // Gunakan 0 jika tidak ada patient_id
        );

        return result.insertId;
    }




    // Mendapatkan semua list test glucose untuk semua pasien dengan pagination
    static async getAllTests(limit = 10, offset = 0, filters = {}) {
        // Bangun query dinamis dengan filter opsional
        let query = 'SELECT gt.*, p.name AS patient_name FROM glucosa_tests gt ';
        query += 'JOIN patients p ON gt.patient_id = p.id ';

        const queryParams = [];
        const whereConditions = [];

        // Filter berdasarkan unit
        if (filters.unit) {
            whereConditions.push('gt.unit = ?');
            queryParams.push(filters.unit);
        }

        // Filter berdasaran rentang tanggal
        if (filters.start_date && filters.end_date) {
            whereConditions.push('gt.date_time BETWEEN ? AND ?');
            queryParams.push(filters.start_date, filters.end_date);
        }

        // Filter berdasarkan patient_id
        if (filters.patient_id) {
            whereConditions.push('gt.patient_id = ?');
            queryParams.push(filters.patient_id);
        }

        // Tambahkan WHERE clause jika ada kondisi
        if (whereConditions.length > 0) {
            query += 'WHERE ' + whereConditions.join(' AND ') + ' ';
        }

        // Tambahkan order dan pagination
        query += 'ORDER BY gt.date_time DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Eksekusi query untuk data
        const [rows] = await db.query(query, queryParams);

        // Hitung total data untuk pagination
        let countQuery = 'SELECT COUNT(*) as total FROM glucosa_tests gt ';

        // Tambahkan WHERE clause untuk total count jika ada
        if (whereConditions.length > 0) {
            countQuery += 'WHERE ' + whereConditions.join(' AND ');
        }

        const [countResult] = await db.query(countQuery, queryParams.slice(0, -2));
        const totalCount = countResult[0].total;

        return {
            data: rows,
            pagination: {
                total_records: totalCount,
                total_pages: Math.ceil(totalCount / limit),
                current_page: Math.floor(offset / limit) + 1,
                per_page: limit
            }
        };
    }


    // Dapatkan semua tes gula darah berdasarkan ID pasien
    static async getByPatientId(patientId, limit = 10, offset = 0) {
        // Cek apakah patient ada
        const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);

        if (patientCheck.length === 0) {
            throw new Error('Patient not found');
        }

        // Hitung total tes gula darah untuk pasien ini
        const [totalCountResult] = await db.query(
            'SELECT COUNT(*) as total FROM glucosa_tests WHERE patient_id = ?',
            [patientId]
        );
        const totalCount = totalCountResult[0].total;

        // Ambil data tes gula darah
        const [rows] = await db.query(
            'SELECT * FROM glucosa_tests WHERE patient_id = ? ORDER BY date_time DESC LIMIT ? OFFSET ?',
            [patientId, limit, offset]
        );

        // Hitung informasi pagination
        const totalPages = Math.ceil(totalCount / limit);
        const currentPage = Math.floor(offset / limit) + 1;

        return {
            data: rows,
            pagination: {
                total_records: totalCount,
                total_pages: totalPages,
                current_page: currentPage,
                per_page: limit,
                next_page: currentPage < totalPages ? currentPage + 1 : null,
                prev_page: currentPage > 1 ? currentPage - 1 : null
            }
        };
    }


    static async getByPatientIdAll(patientId) {
        // Cek apakah patient ada
        const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);

        if (patientCheck.length === 0) {
            throw new Error('Patient not found');
        }

        // Ambil semua data tes gula darah untuk pasien ini
        const [rows] = await db.query(
            'SELECT * FROM glucosa_tests WHERE patient_id = ? ORDER BY date_time DESC',
            [patientId]
        );

        return rows; // Kembalikan data tes gula darah
    }


    // Dapatkan single tes gula darah berdasarkan ID
    static async getById(id) {
        const [rows] = await db.query('SELECT * FROM glucosa_tests WHERE id = ?', [id]);
        return rows[0];
    }

    // Update tes gula darah
    static async update(id, data) {
        const [result] = await db.query(
            'UPDATE glucosa_tests SET date_time = ?, glucos_value = ?, unit = ? WHERE id = ?',
            [data.date_time, data.glucos_value, data.unit, id]
        );
        return result.affectedRows > 0;
    }

    // Hapus tes gula darah
    static async delete(id) {
        const [result] = await db.query('DELETE FROM glucosa_tests WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // Dapatkan statistik gula darah pasien
    static async getPatientStats(patientId) {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_tests,
                MIN(glucos_value) as min_value,
                MAX(glucos_value) as max_value,
                AVG(glucos_value) as avg_value,
                MIN(date_time) as first_test,
                MAX(date_time) as last_test
            FROM glucosa_tests 
            WHERE patient_id = ?
        `, [patientId]);
        return stats[0];
    }

    static async getLatestTest(patientId) {
        const [rows] = await db.query(`
            SELECT *
            FROM glucosa_tests 
            WHERE patient_id = ?
            ORDER BY date_time DESC
            LIMIT 1
        `, [patientId]);
        return rows[0];
    }

    static async getAllWithPagination(limit, offset) {
        const [rows] = await db.query(`SELECT * FROM glucosa_tests LIMIT ? OFFSET ?`, [limit, offset]);
        return rows;
    }

    static async getTotalCount() {
        const [rows] = await db.query('SELECT COUNT(*) as total FROM glucosa_tests');
        return rows[0].total;
    }

    static async syncGlucosaTests() {
        try {
            // Hapus semua data di tabel glucosa_tests_sync
            await db.query('DELETE FROM glucosa_tests_sync');

            // Salin semua data dari tabel glucosa_tests ke tabel glucosa_tests_sync, kecuali kolom patient_id
            await db.query(`
                INSERT INTO glucosa_tests_sync (id, date_time, glucos_value, unit)
                SELECT id, date_time, glucos_value, unit FROM glucosa_tests
            `);

            return { status: 'success', message: 'Glucose tests synchronized successfully' };
        } catch (error) {
            throw new Error('Failed to synchronize glucose tests: ' + error.message);
        }
    }


}

module.exports = TestGlucosaModel;