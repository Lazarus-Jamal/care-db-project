const { Op } = require('sequelize');
const { care_staff, care_person } = require('../models');

// This is your original function to fetch a complete staff list for display.
exports.listStaffWithPersonInfo = async (req, res) => {
    try {
        const staffList = await care_staff.findAll({
            include: [{
                model: care_person,
                as: 'person',
                attributes: ['name_first', 'name_last', 'email', 'sex', 'date_birth']
            }],
            attributes: ['nr', 'job_function_title', 'pid', 'date_join', 'status']
        });

        res.render('staff/list', {
            staffList,
            title: 'Staff Directory'
        });
    } catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).send('Failed to load staff list');
    }
};

// NEW: This function handles the dynamic personnel search from the frontend.
// It queries the database for a small, filtered list of people.
exports.listPersonnel = async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.json([]); // Return an empty array if no search query is provided.
    }

    try {
        const personnel = await care_person.findAll({
            where: {
                [Op.or]: [
                    { name_first: { [Op.like]: `%${query}%` } },
                    { name_last: { [Op.like]: `%${query}%` } }
                ]
            },
            attributes: ['pid', 'name_first', 'name_last', 'email'],
            limit: 20 // Limit the number of results to keep the response small and fast.
        });

        res.json(personnel);
    } catch (error) {
        console.error('Error searching for personnel:', error);
        res.status(500).json({ error: 'Failed to search for personnel' });
    }
};